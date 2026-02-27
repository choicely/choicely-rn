import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import Dashboard from "../../components/Dashboard";
import ScreenLayout from "../../components/ScreenLayout";
import AddContextOverlay from "../../components/AddContextOverlay";
import { useAiChat } from "./AiChatProvider";
import { chatActions } from "../../state/chatStore";
import { AI_CHAT_ROUTES } from "./routes";
import { writeAppMeta } from "../../state/chatIdsCache";
import { ROUTES } from "../../navigation";

const ChatDashboardScreen = ({ navigation, route }) => {
  const {
    configLoading,
    configError,
    authToken,
    tokenError,
    messages,
    pendingMessageTrigger,
    ids,
    context,
    startScreenId,
    hydrated,
    hasExplicitRoute,
    handleSendMessage,
  } = useAiChat();
  const didNavigateRef = useRef(false);
  const suppressAutoChat = route?.params?.suppressAutoChat === true;
  const [showContextOverlay, setShowContextOverlay] = useState(false);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);

  useEffect(() => {
    chatActions.resetNav(AI_CHAT_ROUTES.DASHBOARD);
  }, []);

  useEffect(() => {
    setHistoryRefreshToken((prev) => prev + 1);
  }, [route?.key]);

  const backFocus = route?.params?.focus || null;
  const goToChatSession = useCallback(
    (mode = "navigate") => {
      if (didNavigateRef.current) return;
      didNavigateRef.current = true;
      const nextParams = { source: "dashboard", backFocus };
      if (mode === "replace") {
        navigation.replace(ROUTES.CHAT_SESSION, nextParams);
      } else {
        navigation.navigate(ROUTES.CHAT_SESSION, nextParams);
      }
    },
    [navigation, backFocus]
  );

  useEffect(() => {
    if (suppressAutoChat) return;
    if (messages.length > 0) {
      goToChatSession();
    }
  }, [messages.length, goToChatSession, suppressAutoChat]);

  useEffect(() => {
    if (suppressAutoChat) return;
    if (!hasExplicitRoute && startScreenId && !hydrated) {
      goToChatSession();
    }
  }, [hasExplicitRoute, startScreenId, hydrated, goToChatSession, suppressAutoChat]);

  useEffect(() => {
    if (suppressAutoChat) return;
    if (pendingMessageTrigger > 0) {
      goToChatSession();
    }
  }, [pendingMessageTrigger, goToChatSession, suppressAutoChat]);

  const handleSend = useCallback(
    (text) => {
      const didSend = handleSendMessage(text, { source: "dashboard" });
      if (didSend) {
        goToChatSession();
      }
    },
    [handleSendMessage, goToChatSession]
  );

  const handleOpenContextMenu = useCallback(() => {
    setShowContextOverlay(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setShowContextOverlay(false);
  }, []);

  // Context actions from the dashboard overlay navigate to chat session
  // (media actions require chat to be active)
  const handleContextAction = useCallback(
    (actionId) => {
      if (
        actionId === "camera" ||
        actionId === "photos" ||
        actionId === "files" ||
        actionId === "url"
      ) {
        // Navigate into chat session; ChatScreen will re-open the overlay for media
        goToChatSession();
        return;
      }
      if (actionId === "share") {
        chatActions.navigate({ route: AI_CHAT_ROUTES.SHARE });
        goToChatSession();
      }
    },
    [goToChatSession]
  );

  const handleAppSwitch = useCallback(
    async (payload) => {
      const nextAppKey = typeof payload === "string" ? payload : payload?.appKey;
      const nextAppName = typeof payload === "string" ? null : payload?.appName;
      if (!nextAppKey) return true;

      if (nextAppName) {
        writeAppMeta(nextAppKey, { appName: nextAppName });
      }

      const resolvedBrandId = context?.brandId || ids.brandId;
      const currentAppId = ids.appId;

      if (nextAppKey === currentAppId) {
        chatActions.hydrateForContext({
          brandId: resolvedBrandId,
          appId: nextAppKey,
          screenId: undefined,
        });
        chatActions.resetNav(AI_CHAT_ROUTES.DASHBOARD);
        goToChatSession();
        return true;
      }

      if (!resolvedBrandId) {
        console.log("[AiChat] Switching app session without brandId", {
          toAppKey: nextAppKey,
        });
      }

      chatActions.persistNow();
      chatActions.hydrateForContext({
        brandId: resolvedBrandId,
        appId: nextAppKey,
        screenId: undefined,
      });

      const nextIds = { appId: nextAppKey };
      if (resolvedBrandId) {
        nextIds.brandId = resolvedBrandId;
      }
      chatActions.setIds(nextIds);
      chatActions.setAppReadyInfo(null);
      chatActions.resetNav(AI_CHAT_ROUTES.DASHBOARD);
      goToChatSession();
      return true;
    },
    [context?.brandId, ids.brandId, ids.appId, goToChatSession]
  );

  if (configLoading || (!authToken && !tokenError)) {
    return (
      <ScreenLayout title="Choicely">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading App Context...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (configError || tokenError) {
    return (
      <ScreenLayout title="Choicely">
        <View style={styles.center}>
          <Text>Error loading app:</Text>
          <Text>{configError?.message || tokenError}</Text>
        </View>
      </ScreenLayout>
    );
  }

  const scrollToApps = route?.params?.focus === "apps";

  return (
    <ScreenLayout
      title="Choicely"
      canGoBack={navigation.canGoBack}
      onBack={navigation.goBack}
      showLogo={true}
    >
      <Dashboard
        onSendMessage={handleSend}
        onAppSwitch={handleAppSwitch}
        history={[]}
        scrollToApps={scrollToApps}
        onOpenContextMenu={handleOpenContextMenu}
        historyRefreshToken={historyRefreshToken}
      />
      <AddContextOverlay
        visible={showContextOverlay}
        onClose={handleCloseContextMenu}
        onAction={handleContextAction}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#111",
  },
});

export default ChatDashboardScreen;
