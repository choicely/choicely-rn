import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  BackHandler,
  TouchableOpacity,
  Clipboard, // eslint-disable-line -- deprecated but functional in RN 0.82; @react-native-clipboard/clipboard not installed
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ScreenLayout from "../../components/ScreenLayout";
import ChatScreen from "./ChatScreen";
import ShareAppScreen from "../share/ShareAppScreen";
import { useAiChat } from "./AiChatProvider";
import { chatActions } from "../../state/chatStore";
import { AI_CHAT_LAYERS, AI_CHAT_ROUTES } from "./routes";
import { ROUTES } from "../../navigation";
import {
  fetchBrandAccess,
  fetchAppWithBrand,
} from "../../services/ChoicelyApiService";
import LayerToggle from "./LayerToggle";
import { createBridgeClient } from "../../bridge/ChoicelyRNBridge";

const UNAUTHORIZED_CHAT_MESSAGE =
  "You do not have access to chat with this app. You can still preview it or go back.";
const ACCESS_CHECK_FAILED_MESSAGE =
  "Unable to verify access for this app right now. You can still preview it or go back.";

const ChatSessionScreen = ({ navigation, route }) => {
  const {
    configLoading,
    configError,
    authToken,
    tokenError,
    messages,
    suggestions,
    appReadyInfo,
    loading,
    error,
    verboseLog,
    ids,
    appTitle,
    previewEnabled,
    previewAppKey,
    chatApi,
    handleSendMessage,
    navState,
    appInfo,
  } = useAiChat();

  const flatListRef = useRef(null);
  const validatedAppIdRef = useRef(null);
  const accessCheckRequestIdRef = useRef(0);
  const abortRequestRef = useRef(null);
  const [appAccessState, setAppAccessState] = useState({
    status: "idle",
    appId: null,
    message: null,
  });
  const activeLayer = navState.current.layer;
  const currentRoute = navState.current.route;
  const backFocus = route?.params?.backFocus;
  const hasBackTarget = route?.params?.source === "dashboard";
  const shouldFallbackToDashboard = hasBackTarget || !navigation.canGoBack;
  const canGoBack = navigation.canGoBack || shouldFallbackToDashboard;

  const handleBack = useCallback(() => {
    // When this screen was entered from dashboard, always return with suppressAutoChat
    // to avoid immediately navigating back into chat due existing messages.
    if (hasBackTarget || shouldFallbackToDashboard) {
      navigation.reset(
        ROUTES.CHAT_DASHBOARD,
        backFocus
          ? { focus: backFocus, suppressAutoChat: true }
          : { suppressAutoChat: true }
      );
      return;
    }

    if (navigation.canGoBack) {
      navigation.goBack();
    }
  }, [navigation, hasBackTarget, shouldFallbackToDashboard, backFocus]);

  useEffect(() => {
    chatActions.resetNav(AI_CHAT_ROUTES.CHAT);
  }, []);

  useEffect(() => {
    abortRequestRef.current = chatApi?.abortRequest || null;
  }, [chatApi?.abortRequest]);

  useEffect(() => {
    return () => {
      if (abortRequestRef.current) {
        abortRequestRef.current();
      }
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (activeLayer === AI_CHAT_LAYERS.PREVIEW) {
        chatActions.navigate({ layer: AI_CHAT_LAYERS.CHAT }, { replace: true });
        return true;
      }
      if (canGoBack) {
        handleBack();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [activeLayer, canGoBack, handleBack]);

  useEffect(() => {
    if (!ids.appId) {
      validatedAppIdRef.current = null;
      setAppAccessState({ status: "idle", appId: null, message: null });
      return;
    }
    if (!authToken) return;
    if (
      validatedAppIdRef.current === ids.appId &&
      ids.brandId &&
      ids.screenId
    ) {
      setAppAccessState((prev) =>
        prev.appId === ids.appId && prev.status === "allowed"
          ? prev
          : { status: "allowed", appId: ids.appId, message: null }
      );
      return;
    }

    const requestId = accessCheckRequestIdRef.current + 1;
    accessCheckRequestIdRef.current = requestId;
    const currentAppId = ids.appId;
    setAppAccessState({
      status: "checking",
      appId: currentAppId,
      message: null,
    });

    const verifyAppAccessAndHydrateMeta = async () => {
      try {
        const bridge = createBridgeClient();
        try {
          const userInfo = await bridge.request("choicely:auth:getUserInfo");

          if (!userInfo?.accessToken || !userInfo?.userKey) {
            if (accessCheckRequestIdRef.current === requestId) {
              setAppAccessState({
                status: "denied",
                appId: currentAppId,
                message: "Session expired. Please sign in again.",
              });
            }
            return;
          }

          const brands = await fetchBrandAccess(
            userInfo.accessToken,
            userInfo.userKey,
            currentAppId,
            { throwOnError: true }
          );
          if (!Array.isArray(brands) || brands.length === 0) {
            if (accessCheckRequestIdRef.current === requestId) {
              setAppAccessState({
                status: "denied",
                appId: currentAppId,
                message: UNAUTHORIZED_CHAT_MESSAGE,
              });
            }
            return;
          }

          let nextBrandId = ids.brandId;
          let nextScreenId = ids.screenId;

          if (!nextBrandId || !brands.includes(nextBrandId)) {
            nextBrandId = brands[0];
          }

          if (nextBrandId && !nextScreenId) {
            const appPayload = await fetchAppWithBrand(
              userInfo.accessToken,
              currentAppId,
              nextBrandId
            );
            nextScreenId =
              appPayload?.screen_key ||
              appPayload?.screenKey ||
              appPayload?.screen?.key ||
              appPayload?.default_nav_item?.screen_key ||
              appPayload?.default_nav_item?.screenKey ||
              appPayload?.screens?.[0]?.key ||
              appPayload?.main_screen?.key ||
              appPayload?.screen_id ||
              null;
          }

          if (
            accessCheckRequestIdRef.current === requestId &&
            (nextBrandId || nextScreenId)
          ) {
            chatActions.setIds({
              ...(nextBrandId ? { brandId: nextBrandId } : null),
              ...(nextScreenId ? { screenId: nextScreenId } : null),
            });
          }

          if (accessCheckRequestIdRef.current === requestId) {
            validatedAppIdRef.current = currentAppId;
            setAppAccessState({
              status: "allowed",
              appId: currentAppId,
              message: null,
            });
          }
        } finally {
          bridge.destroy();
        }
      } catch (err) {
        console.error("[AiChat] Failed to verify app access:", err);
        if (accessCheckRequestIdRef.current === requestId) {
          setAppAccessState({
            status: "denied",
            appId: currentAppId,
            message:
              err?.status === 401
                ? "Session expired. Please sign in again."
                : ACCESS_CHECK_FAILED_MESSAGE,
          });
        }
      }
    };

    verifyAppAccessAndHydrateMeta();
  }, [ids.appId, ids.brandId, ids.screenId, authToken]);

  const isAccessCheckForCurrentApp = appAccessState.appId === ids.appId;
  const securityCheckLoading = Boolean(
    ids.appId &&
    isAccessCheckForCurrentApp &&
    appAccessState.status === "checking"
  );
  const chatDisabled = Boolean(
    ids.appId &&
    isAccessCheckForCurrentApp &&
    appAccessState.status === "denied"
  );
  const chatDisabledMessage = chatDisabled
    ? appAccessState.message || UNAUTHORIZED_CHAT_MESSAGE
    : null;

  const handleLayerChange = useCallback(
    async (layer) => {
      if (layer === activeLayer) return;
      if (layer === AI_CHAT_LAYERS.PREVIEW) {
        if (!previewAppKey || !chatApi) return;
        chatActions.persistNow();
        await chatApi.openAppPreview(previewAppKey);
      }
      chatActions.navigate(
        { layer },
        {
          replace:
            activeLayer === AI_CHAT_LAYERS.PREVIEW &&
            layer === AI_CHAT_LAYERS.CHAT,
        }
      );
    },
    [activeLayer, previewAppKey, chatApi]
  );

  const handleSend = useCallback(
    (text) => {
      if (securityCheckLoading || chatDisabled) return;
      handleSendMessage(text, { source: "chat" });
    },
    [handleSendMessage, securityCheckLoading, chatDisabled]
  );

  const handleContextAction = useCallback(
    async (actionId, data) => {
      if (securityCheckLoading || chatDisabled) {
        return;
      }
      console.log("[ChatSessionScreen] Context action:", actionId, data);
      if (actionId === "share") {
        chatActions.navigate({ route: AI_CHAT_ROUTES.SHARE });
        return;
      }

      if (
        actionId !== "selectTheme" &&
        actionId !== "selectLayout" &&
        actionId !== "push"
      ) {
        return;
      }

      const bridge = createBridgeClient();
      try {
        if (actionId === "push") {
          await bridge.request("choicely:navigation", {
            inner_navigation: "choicely://studio/push",
          });
          return;
        }

        if (!ids.appId) {
          console.warn(
            `[ChatSessionScreen] ${actionId} skipped: missing appId for app:store`
          );
          return;
        }

        const selectionValue =
          typeof data === "string"
            ? data
            : actionId === "selectTheme"
              ? data?.themeId || data?.id || null
              : data?.layoutId || data?.id || null;
        if (!selectionValue) {
          console.warn(
            `[ChatSessionScreen] ${actionId} skipped: missing value`
          );
          return;
        }

        await bridge.request("choicely:app:store", {
          appKey: ids.appId,
          updated: Date.now(),
          ...(actionId === "selectTheme"
            ? { themeId: selectionValue }
            : { layoutId: selectionValue }),
        });
      } catch (bridgeError) {
        console.warn(`[ChatSessionScreen] ${actionId} failed:`, bridgeError);
      } finally {
        bridge.destroy();
      }
    },
    [ids.appId, securityCheckLoading, chatDisabled]
  );

  const handleBackFromShare = useCallback(() => {
    chatActions.navigate({ route: AI_CHAT_ROUTES.CHAT });
  }, []);

  const handleShareCopyLink = useCallback((link) => {
    // Link is already known client-side — write to clipboard directly.
    // No bridge or backend call needed.
    Clipboard.setString(link || "");
  }, []);

  const handleShareInvitePeople = useCallback(() => {
    // invite is a backend operation — not yet implemented
    console.warn("[ChatSessionScreen] invite: not yet implemented");
  }, []);

  const handleShareManagePeople = useCallback(() => {
    // manageAccess is a backend operation — not yet implemented
    console.warn("[ChatSessionScreen] manageAccess: not yet implemented");
  }, []);

  const handleSharePublish = useCallback(() => {
    // publish is a backend operation — not yet implemented
    console.warn("[ChatSessionScreen] publish: not yet implemented");
  }, []);

  if (configLoading || (!authToken && !tokenError)) {
    return (
      <ScreenLayout title="Choicely" canGoBack={canGoBack} onBack={handleBack}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading App Context...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (configError || tokenError) {
    const errorMsg = configError?.message || tokenError;
    const isSessionError =
      typeof errorMsg === "string" &&
      /session|expired|sign.?in|auth|token/i.test(errorMsg);

    return (
      <ScreenLayout title="Choicely" canGoBack={canGoBack} onBack={handleBack}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons
              name={
                isSessionError ? "lock-closed-outline" : "alert-circle-outline"
              }
              size={36}
              color={isSessionError ? "#D97706" : "#DC2626"}
            />
          </View>
          <Text style={styles.errorTitle}>
            {isSessionError ? "Session Expired" : "Something went wrong"}
          </Text>
          <Text style={styles.errorMessage}>{errorMsg}</Text>
          <View style={styles.errorActions}>
            {isSessionError ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate(ROUTES.PROFILE)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.primaryBtnText}>Sign In</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  validatedAppIdRef.current = null;
                  setAppAccessState({
                    status: "idle",
                    appId: null,
                    message: null,
                  });
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.primaryBtnText}>Try Again</Text>
              </TouchableOpacity>
            )}
            {canGoBack && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Go Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScreenLayout>
    );
  }

  const showAppBadge = appTitle !== "Choicely";

  return (
    <ScreenLayout
      title={appTitle}
      canGoBack={canGoBack}
      onBack={handleBack}
      showAppBadge={showAppBadge}
      badgeLabel={appTitle}
      rightContent={
        <LayerToggle
          activeLayer={activeLayer}
          onLayerChange={handleLayerChange}
          previewEnabled={previewEnabled}
        />
      }
    >
      {currentRoute === AI_CHAT_ROUTES.SHARE &&
      !securityCheckLoading &&
      !chatDisabled ? (
        <ShareAppScreen
          appTitle={appInfo?.title || appTitle}
          appDescription={appInfo?.description || "Your app"}
          appIconUrl={appInfo?.iconUrl}
          heroImageUrl={appInfo?.heroImageUrl}
          previewLink={appInfo?.previewLink}
          onCopyLink={handleShareCopyLink}
          onInvitePeople={handleShareInvitePeople}
          onManagePeople={handleShareManagePeople}
          onPublish={handleSharePublish}
          onClose={handleBackFromShare}
        />
      ) : (
        <ChatScreen
          messages={messages}
          flatListRef={flatListRef}
          loading={loading}
          verboseLog={verboseLog}
          error={error}
          securityCheckLoading={securityCheckLoading}
          chatDisabled={chatDisabled}
          chatDisabledMessage={chatDisabledMessage}
          suggestions={suggestions}
          showSuggestions={true}
          appReady={appReadyInfo}
          onOpenAppReady={() => handleLayerChange(AI_CHAT_LAYERS.PREVIEW)}
          onDismissAppReady={() => chatActions.setAppReadyInfo(null)}
          onSendMessage={handleSend}
          onContextAction={handleContextAction}
          onSignIn={() => navigation.navigate(ROUTES.PROFILE)}
          onGoBack={canGoBack ? handleBack : null}
        />
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 10,
    color: "#111",
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  errorActions: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
});

export default ChatSessionScreen;
