import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import useMobileChatApi from "../hooks/useMobileChatApi";
import useAppData from "../hooks/useAppData"; // Use our new hook
// import ChatMessage from './ChatMessage' // Unused
import ChatInput from "./ChatInput";
import MessageItem from "./MessageItem";
import SuggestionsBar from "./SuggestionsBar";
import Dashboard from "./Dashboard";
import { createBridgeClient } from "../bridge/ChoicelyRNBridge";

export const rootOptions = { disableScrollView: true };

const AiChat = (props) => {
  // 1. Get Dynamic Data
  const {
    context,
    appConfig,
    startScreenId,
    loading: configLoading,
    error: configError,
  } = useAppData();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verboseLog, setVerboseLog] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [, setRenderState] = useState(null);

  // Derived values from context
  const brandId = context?.brandId;
  const appId = context?.appKey;
  const screenId = startScreenId;

  const bridge = useRef(null);
  const [authToken, setAuthToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const flatListRef = useRef(null);

  // Resolve auth token from native bridge on mount.
  useEffect(() => {
    let cancelled = false;
    bridge.current = createBridgeClient();

    bridge.current
      .request("choicely:auth:getToken")
      .then((res) => {
        if (cancelled) return;
        if (res.token) {
          setAuthToken(res.token);
        } else {
          setTokenError("No token received");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Bridge auth error:", err);
        setTokenError(err.message || "Bridge connection failed");
      });

    return () => {
      cancelled = true;
      if (bridge.current) {
        bridge.current.destroy();
      }
    };
  }, []);


  // 2. Chat Hook with Dynamic IDs
  // Only initialize chat hook when we have the necessary IDs
  const chatApi = useMobileChatApi(authToken, brandId, appId, screenId, {
    setMessages,
    setLoading,
    setError,
    setVerboseLog,
    setRenderState,
    setSuggestions,
    updateSuggestions: (val) => {
      if (typeof val === "string") {
        // special handling if needed
      } else if (Array.isArray(val)) {
        setSuggestions(val);
      }
    },
    messages,
  });

  // State for internal routing (home vs chat)
  // Default to props.route or 'home'
  // If we have a startScreenId, we might want to default to 'chat' if no specific route passed?
  // User asked to use route param.
  const [currentRoute, setCurrentRoute] = useState(props.route || "home");

  // Effect to handle startScreenId -> auto-navigate to chat if not already set
  // This satisfies "load the first bottom navigation on app load"
  useEffect(() => {
    if (startScreenId && !props.route) {
      setCurrentRoute("chat");
    }
  }, [startScreenId, props.route]);

  // Check for pending message saved before login
  useEffect(() => {
    if (!authToken || !chatApi) return;

    // Delay the check to ensure MMKV runtime is ready
    const timeoutId = setTimeout(() => {
      try {
        const { getMMKV, removeMMKVKey } = require("../state/mmkv");
        const storage = getMMKV();
        const PENDING_MESSAGE_KEY = "choicely_pending_chat_message";
        const pendingMessage = storage.getString(PENDING_MESSAGE_KEY);

        console.log("[AiChat] Checking pending message:", pendingMessage);

        if (pendingMessage) {
          // Clear it first to prevent re-sending on re-renders
          removeMMKVKey(PENDING_MESSAGE_KEY);
          // Send the pending message
          console.log("[AiChat] Sending pending message after login");
          setCurrentRoute("chat");
          chatApi.sendMessage(pendingMessage);
        }
      } catch (pendingMessageError) {
        console.error(
          "[AiChat] Error checking pending message:",
          pendingMessageError
        );
      }
    }, 1000); // 1s delay to wait for MMKV runtime

    return () => clearTimeout(timeoutId);
  }, [authToken, chatApi]);

  const isChatMode = currentRoute === "chat";

  const handleSendMessage = useCallback((text) => {
    console.log("[AiChat] handleSendMessage called with:", text);
    if (!text.trim()) return;
    console.log("[AiChat] Switching to chat mode and calling chatApi.sendMessage");
    setCurrentRoute("chat");
    chatApi.sendMessage(text);
  }, [chatApi]);

  const clearMessages = () => {
    setMessages([]);
    setError(null);
    setSuggestions([]);
    setCurrentRoute("home");
  };

  const chat = {
    messages,
    loading,
    error,
    verboseLog,
    suggestions,
    showSuggestions: true,
    clearMessages,
  };

  const listFooterComponent = !isChatMode ? (
    <Dashboard
      onSendMessage={handleSendMessage}
      onAppSwitch={() => console.log("App Switching triggered")}
      history={[]}
    />
  ) : null;

  // Loading State for Config
  if (configLoading || (!authToken && !tokenError)) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingContextText}>Loading App Context...</Text>
      </View>
    );
  }

  if (configError || tokenError) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Error loading app:</Text>
        <Text>{configError?.message || tokenError}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={chat.messages}
        renderItem={({ item }) => <MessageItem item={item} />}
        keyExtractor={(item, index) => `msg-${index}-${item.role}`}
        contentContainerStyle={[
          styles.messagesList,
          // Add padding top if no messages to allow dashboard to sit nicely?
          // No, dashboard is footer.
        ]}
        style={styles.list}
        inverted={false}
        ListFooterComponent={listFooterComponent}
      />

      {/* Suggestions are shown below messages in chat mode */}
      {isChatMode && chat.showSuggestions && chat.suggestions.length > 0 && (
        <SuggestionsBar
          suggestions={chat.suggestions}
          onSelect={handleSendMessage}
          disabled={chat.loading}
        />
      )}

      {chat.loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#000" />
          {chat.verboseLog ? (
            <Text style={styles.loaderText}>{chat.verboseLog}</Text>
          ) : null}
        </View>
      )}

      {chat.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {chat.error}</Text>
        </View>
      )}

      {isChatMode && (
        <ChatInput
          onSend={handleSendMessage}
          disabled={chat.loading}
          placeholder={
            isChatMode
              ? "Ask Choicely AI"
              : `Ask about ${appConfig?.title || "this app"}...`
          }
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  loaderContainer: {
    padding: 10,
    alignItems: "center",
  },
  loadingContextText: {
    marginTop: 10,
  },
  loaderText: {
    color: "#666",
  },
  errorBanner: {
    padding: 12,
    backgroundColor: "#fff1f1",
    alignItems: "center",
  },
  errorBannerText: {
    fontSize: 12,
    color: "#c00",
  },
});

export default AiChat;
