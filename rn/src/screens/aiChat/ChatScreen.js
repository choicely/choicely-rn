import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ChatInput from "../../components/ChatInput";
import MessageItem from "../../components/MessageItem";
import SuggestionsBar from "../../components/SuggestionsBar";
import AppReadyCard from "../../components/AppReadyCard";
import AddContextOverlay from "../../components/AddContextOverlay";
import { pickContextAttachment } from "../../utils/contextTransferPicker";

const CONTEXT_TRANSFER_TIMEOUT_MS = 90000;
const ACCESS_CHECKING_MESSAGE = "Checking your access to this app...";

const ACCESS_CHECK_SKELETON_MESSAGES = [
  { id: "skel-1", type: "access_check_skeleton", width: "62%", side: "bot" },
  { id: "skel-2", type: "access_check_skeleton", width: "45%", side: "user" },
  { id: "skel-3", type: "access_check_skeleton", width: "70%", side: "bot" },
  { id: "skel-4", type: "access_check_skeleton", width: "38%", side: "user" },
];

const AccessCheckSkeletonItem = ({ width, side = "bot" }) => {
  const isUser = side === "user";
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View
      style={[
        styles.messageRowSkeleton,
        isUser ? styles.rowUser : styles.rowBot,
      ]}
    >
      {!isUser && <View style={styles.avatarSkeleton} />}
      <Animated.View
        style={[
          styles.skeletonBubble,
          isUser ? styles.skeletonBubbleUser : styles.skeletonBubbleBot,
          { width, opacity },
        ]}
      />
    </View>
  );
};

const TypingDot = ({ delay = 0 }) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: -4,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(600 - delay),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [translateY, delay]);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#9CA3AF",
        transform: [{ translateY }],
      }}
    />
  );
};

const withTimeout = (promise, timeoutMs, message) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(message);
      error.code = "ERR_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};

const buildContextAttachment = (actionId, payload = {}) => {
  const type = payload.type || (actionId === "files" ? "file" : "image");
  const key = payload.key || payload.fileKey || payload.imageKey || null;
  const url = payload.url || payload.downloadUrl || payload.uri || null;
  const fileName = payload.fileName || payload.name || null;
  const mimeType = payload.mimeType || null;
  const data =
    typeof payload.data === "string" && payload.data.length > 0
      ? payload.data
      : null;
  const fallbackLabel =
    actionId === "camera"
      ? "Camera image"
      : actionId === "photos"
        ? "Photo"
        : "File";

  return {
    type,
    source: payload.source || actionId,
    key,
    url,
    mimeType,
    data,
    fileName,
    label: fileName || fallbackLabel,
    raw: payload,
  };
};

const addAttachmentContextToPrompt = (text, attachment) => {
  if (!attachment) {
    return text;
  }
  const mimeType =
    attachment.mimeType ||
    (attachment.type === "file" ? "application/octet-stream" : "image/jpeg");
  const reference = attachment.data
    ? `data:${mimeType};base64,${attachment.data}`
    : attachment.url || attachment.key;
  if (!reference) {
    return text;
  }
  return `${text}\n\nAttached ${attachment.type || "context"}: ${reference}`;
};

const ChatScreen = ({
  messages,
  flatListRef,
  loading,
  verboseLog,
  error,
  suggestions,
  showSuggestions,
  appReady,
  onOpenAppReady,
  onDismissAppReady,
  onSendMessage,
  inputValue: inputValueProp,
  onInputChange: onInputChangeProp,
  onContextAction,
  onSignIn,
  onGoBack,
  securityCheckLoading = false,
  chatDisabled = false,
  chatDisabledMessage = null,
}) => {
  const hasInputOverride =
    inputValueProp != null || typeof onInputChangeProp === "function";
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showContextOverlay, setShowContextOverlay] = useState(false);
  const [contextAttachment, setContextAttachment] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(null);
  const isNearBottomRef = useRef(true);
  const contextTransferRequestIdRef = useRef(0);
  const isInputDisabled =
    loading || contextLoading || securityCheckLoading || chatDisabled;
  const visibleMessages = securityCheckLoading
    ? ACCESS_CHECK_SKELETON_MESSAGES
    : messages;

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const isNearBottom = distanceFromBottom < 120;
    if (isNearBottomRef.current !== isNearBottom) {
      isNearBottomRef.current = isNearBottom;
      setShowScrollToBottom(!isNearBottom);
    }
  }, []);

  const scrollToBottom = useCallback(
    (animated = true) => {
      if (!flatListRef?.current) return;
      flatListRef.current.scrollToEnd({ animated });
    },
    [flatListRef]
  );

  useEffect(() => {
    if (isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(true));
    } else {
      setShowScrollToBottom(true);
    }
  }, [visibleMessages.length, scrollToBottom]);

  const handleOpenContextOverlay = useCallback(() => {
    if (isInputDisabled) return;
    setShowContextOverlay(true);
  }, [isInputDisabled]);

  const handleCloseContextOverlay = useCallback(() => {
    setShowContextOverlay(false);
  }, []);

  const handleClearContext = useCallback(() => {
    contextTransferRequestIdRef.current += 1;
    setContextLoading(false);
    setContextAttachment(null);
    setContextError(null);
  }, []);

  const handleUrlDetected = useCallback(
    (data) => {
      if (!data?.url || contextAttachment) return;
      const attachment = {
        type: "url",
        source: "url",
        key: null,
        url: data.url,
        fileName: null,
        label: data.url,
        raw: data,
      };
      setContextAttachment(attachment);
      if (onContextAction) {
        onContextAction("url", attachment);
      }
    },
    [contextAttachment, onContextAction]
  );

  const handleSendWithContext = useCallback(
    (text) => {
      if (isInputDisabled) return;
      const message = addAttachmentContextToPrompt(text, contextAttachment);
      onSendMessage(message);
      if (contextAttachment) {
        setContextAttachment(null);
      }
    },
    [contextAttachment, onSendMessage, isInputDisabled]
  );

  const handleContextAction = useCallback(
    async (actionId, data) => {
      console.log("[ChatScreen] Context action:", actionId, data);

      // URL: build attachment directly from the submitted URL, no bridge call needed
      if (actionId === "url") {
        const url = data?.url;
        if (url) {
          const attachment = {
            type: "url",
            source: "url",
            key: null,
            url,
            fileName: null,
            label: url,
            raw: data,
          };
          setContextAttachment(attachment);
          if (onContextAction) {
            onContextAction(actionId, attachment);
          }
        }
        return;
      }

      if (
        actionId !== "camera" &&
        actionId !== "photos" &&
        actionId !== "files"
      ) {
        if (onContextAction) {
          onContextAction(actionId, data);
        }
        return;
      }

      setShowContextOverlay(false);
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });

      setContextLoading(true);
      setContextError(null);
      const requestId = contextTransferRequestIdRef.current + 1;
      contextTransferRequestIdRef.current = requestId;
      try {
        console.log("[ChatScreen] Starting RN context picker:", actionId);
        const timeoutMessage =
          actionId === "camera"
            ? "Camera request timed out"
            : actionId === "photos"
              ? "Image upload request timed out"
              : "File upload request timed out";

        const transferResult = await withTimeout(
          pickContextAttachment(actionId),
          CONTEXT_TRANSFER_TIMEOUT_MS,
          timeoutMessage
        );

        if (contextTransferRequestIdRef.current !== requestId) {
          return;
        }
        if (!transferResult) {
          return;
        }
        console.log("[ChatScreen] RN context picker result:", {
          actionId,
          responseKeys: Object.keys(transferResult || {}),
        });
        const attachment = buildContextAttachment(actionId, transferResult);
        setContextAttachment(attachment);
        if (onContextAction) {
          onContextAction(actionId, attachment);
        }
      } catch (err) {
        if (contextTransferRequestIdRef.current !== requestId) {
          return;
        }
        if (err?.code !== "ERR_CANCELLED") {
          console.error("[ChatScreen] Context transfer failed:", err);
          setContextError(err?.message || "Unable to attach context");
        }
      } finally {
        if (contextTransferRequestIdRef.current === requestId) {
          console.log("[ChatScreen] RN context picker finished:", actionId);
          setContextLoading(false);
        }
      }
    },
    [onContextAction]
  );

  const mergedError = error || contextError;
  const accessInfoText = securityCheckLoading
    ? ACCESS_CHECKING_MESSAGE
    : chatDisabledMessage;
  const isSessionExpired =
    typeof chatDisabledMessage === "string" &&
    /session|expired|sign.?in/i.test(chatDisabledMessage);

  const contextLabelText = contextLoading
    ? "Attaching context..."
    : contextAttachment
      ? contextAttachment.type === "url"
        ? contextAttachment.url.length > 40
          ? contextAttachment.url.slice(0, 37) + "..."
          : contextAttachment.url
        : contextAttachment.label
      : null;

  const chatInputProps = {
    onSend: handleSendWithContext,
    disabled: isInputDisabled,
    placeholder: "Ask Choicely AI",
    onPlusPress: handleOpenContextOverlay,
    contextLabel: contextLabelText,
    contextAttachment,
    onClearContext: handleClearContext,
    onUrlDetected: handleUrlDetected,
  };

  if (hasInputOverride) {
    chatInputProps.value = inputValueProp;
    chatInputProps.onChangeText = onInputChangeProp;
  }

  useEffect(() => {
    if (isInputDisabled) {
      setShowContextOverlay(false);
    }
  }, [isInputDisabled]);

  const renderMessageRow = useCallback(({ item }) => {
    if (item?.type === "access_check_skeleton") {
      return <AccessCheckSkeletonItem width={item.width} side={item.side} />;
    }
    return <MessageItem item={item} />;
  }, []);

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        renderItem={renderMessageRow}
        keyExtractor={(item, index) =>
          item.id || `msg-${index}-${item.role || "bot"}`
        }
        contentContainerStyle={styles.messagesList}
        style={styles.list}
        inverted={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {showSuggestions && suggestions.length > 0 && (
        <SuggestionsBar
          suggestions={suggestions}
          onSelect={onSendMessage}
          disabled={isInputDisabled}
        />
      )}

      {loading && !securityCheckLoading && !chatDisabled && (
        <View style={styles.loaderRow}>
          <View style={styles.loaderAvatar}>
            <Text style={styles.loaderAvatarText}>🤖</Text>
          </View>
          <View style={styles.loaderBubble}>
            <View style={styles.loaderDots}>
              <TypingDot delay={0} />
              <TypingDot delay={200} />
              <TypingDot delay={400} />
            </View>
            {verboseLog ? (
              <Text
                style={styles.loaderText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {verboseLog.replace(/\.+$/, "")}...
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {accessInfoText ? (
        <View
          style={[
            styles.accessBanner,
            chatDisabled &&
            (isSessionExpired
              ? styles.accessBannerSession
              : styles.accessBannerBlocked),
          ]}
        >
          <Text
            style={[
              styles.accessBannerText,
              chatDisabled && styles.accessBannerTextBlocked,
            ]}
          >
            {isSessionExpired ? "Your session has expired." : accessInfoText}
          </Text>
          {chatDisabled && (
            <View style={styles.accessBannerActions}>
              {isSessionExpired && onSignIn ? (
                <TouchableOpacity
                  style={styles.bannerPrimaryBtn}
                  onPress={onSignIn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color="#fff"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.bannerPrimaryBtnText}>Sign In</Text>
                </TouchableOpacity>
              ) : null}
              {onGoBack ? (
                <TouchableOpacity
                  style={styles.bannerSecondaryBtn}
                  onPress={onGoBack}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bannerSecondaryBtnText}>Go Back</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      {mergedError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText} numberOfLines={2}>
            ⚠️ {mergedError}
          </Text>
          <TouchableOpacity
            style={styles.errorDismiss}
            onPress={() => {
              /* Clear only the context error; upstream error is transient */
              if (contextError) handleClearContext();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={14} color="#c00" />
          </TouchableOpacity>
        </View>
      )}

      {!chatDisabled && appReady?.appKey && (
        <View style={styles.appReadyContainer}>
          <AppReadyCard
            title="Your app is ready!"
            subtitle="Tap to preview"
            timestamp={Date.now()}
            onPress={onOpenAppReady}
            onMenuPress={onDismissAppReady}
          />
        </View>
      )}

      <ChatInput {...chatInputProps} />

      {showScrollToBottom ? (
        <TouchableOpacity
          style={styles.scrollToBottom}
          onPress={() => scrollToBottom(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-down" size={18} color="#111" />
        </TouchableOpacity>
      ) : null}

      {/* Add Context Overlay */}
      <AddContextOverlay
        visible={showContextOverlay}
        onClose={handleCloseContextOverlay}
        onAction={handleContextAction}
      />
    </>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  messagesList: {
    paddingTop: 16,
    paddingBottom: 28,
  },
  messageRowSkeleton: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
    paddingHorizontal: 16,
  },
  rowBot: {
    justifyContent: "flex-start",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  avatarSkeleton: {
    width: 32,
    height: 32,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#E7E7E7",
  },
  skeletonBubble: {
    height: 40,
    borderRadius: 18,
    backgroundColor: "#ECECEC",
  },
  skeletonBubbleBot: {
    borderTopLeftRadius: 4,
  },
  skeletonBubbleUser: {
    borderTopRightRadius: 4,
  },
  /* -- Loading bubble (matches bot message shape) -- */
  loaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  loaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  loaderAvatarText: {
    fontSize: 16,
  },
  loaderBubble: {
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  loaderDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  loaderText: {
    color: "#888",
    fontSize: 13,
    marginLeft: 4,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff1f1",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorBannerText: {
    fontSize: 12,
    color: "#c00",
    flex: 1,
  },
  errorDismiss: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fde8e8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  accessBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  accessBannerBlocked: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
  },
  accessBannerSession: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
  },
  accessBannerText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  accessBannerTextBlocked: {
    color: "#374151",
  },
  accessBannerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    justifyContent: "center",
  },
  bannerPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bannerPrimaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  bannerSecondaryBtn: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  bannerSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  appReadyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scrollToBottom: {
    position: "absolute",
    right: 18,
    bottom: 78,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});

export default ChatScreen;

