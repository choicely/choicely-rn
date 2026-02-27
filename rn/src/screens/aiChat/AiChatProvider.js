import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { AppState } from "react-native";
import useMobileChatApi from "../../hooks/useMobileChatApi";
import useAppData from "../../hooks/useAppData";
import { useChatStore, chatActions, getChatState } from "../../state/chatStore";
import { readAppMeta } from "../../state/chatIdsCache";
import { AI_CHAT_LAYERS } from "./routes";
import { createBridgeClient } from "../../bridge/ChoicelyRNBridge";
import { BridgeEvents } from "../../bridge/BridgeEvents";

const AiChatContext = React.createContext(null);

export const AiChatProvider = ({ children, hasExplicitRoute = false }) => {
  const {
    context,
    appConfig,
    startScreenId,
    loading: configLoading,
    error: configError,
  } = useAppData();

  const navState = useChatStore((state) => state.nav);
  const messages = useChatStore((state) => state.chat.messages);
  const suggestions = useChatStore((state) => state.chat.suggestions);
  const appReadyInfo = useChatStore((state) => state.chat.appReadyInfo);
  const loading = useChatStore((state) => state.volatile.loading);
  const error = useChatStore((state) => state.volatile.error);
  const verboseLog = useChatStore((state) => state.volatile.verboseLog);
  const ids = useChatStore((state) => state.ids);
  const hydrated = useChatStore((state) => state.hydrated);

  const activeLayer = navState.current.layer;
  const brandId = context?.brandId;
  const appId = context?.appKey;
  const screenId = startScreenId;

  useEffect(() => {
    if (!appId) return;
    chatActions.hydrateForContext({ brandId, appId, screenId });
    const nextIds = { appId };
    if (typeof screenId !== "undefined") {
      nextIds.screenId = screenId;
    }
    if (brandId) {
      nextIds.brandId = brandId;
    }
    chatActions.setIds(nextIds);
  }, [appId, screenId, brandId]);

  useEffect(() => {
    if (!brandId || !appId) return;
    const nextIds = { brandId };
    if (typeof screenId !== "undefined") {
      nextIds.screenId = screenId;
    }
    chatActions.setIds(nextIds);
  }, [brandId, appId, screenId]);

  const bridge = useRef(null);
  const [authToken, setAuthToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const pendingMessageCheckedRef = useRef(false);
  const [pendingMessageTrigger, setPendingMessageTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    bridge.current = createBridgeClient();

    bridge.current
      .request(BridgeEvents.AUTH_GET_TOKEN)
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

  const chatApi = useMobileChatApi(authToken, ids, {
    setMessages: chatActions.setMessages,
    setLoading: chatActions.setLoading,
    setError: chatActions.setError,
    setVerboseLog: chatActions.setVerboseLog,
    setRenderState: chatActions.setRenderState,
    setIds: chatActions.setIds,
    setSuggestions: chatActions.setSuggestions,
    onAppReady: chatActions.setAppReadyInfo,
    updateSuggestions: chatActions.updateSuggestions,
    getIds: () => getChatState().ids,
  });

  const sendPendingMessage = chatApi?.sendMessage;
  const sendMessage = chatApi?.sendMessage;

  useEffect(() => {
    pendingMessageCheckedRef.current = false;
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !sendPendingMessage) return;
    if (pendingMessageCheckedRef.current) return;
    pendingMessageCheckedRef.current = true;

    const timeoutId = setTimeout(() => {
      try {
        const { getMMKV, removeMMKVKey } = require("../../state/mmkv");
        const storage = getMMKV();
        const PENDING_MESSAGE_KEY = "choicely_pending_chat_message";
        const pendingMessage = storage.getString(PENDING_MESSAGE_KEY);

        console.log("[AiChat] Checking pending message:", pendingMessage);

        if (pendingMessage) {
          removeMMKVKey(PENDING_MESSAGE_KEY);
          console.log("[AiChat] Sending pending message after login");
          sendPendingMessage(pendingMessage);
          setPendingMessageTrigger((prev) => prev + 1);
        }
      } catch (err) {
        console.error("[AiChat] Error checking pending message:", err);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [authToken, sendPendingMessage]);

  useEffect(() => {
    if (!ids?.appId || !hydrated) return;

    const timeoutId = setTimeout(() => {
      try {
        const { getMMKV, removeMMKVKey } = require("../../state/mmkv");
        const storage = getMMKV();
        const PENDING_TEMPLATE_KEY = "choicely_pending_template_app";
        const pendingData = storage.getString(PENDING_TEMPLATE_KEY);

        if (!pendingData) return;

        const parsed = JSON.parse(pendingData);
        console.log("[AiChat] Checking pending template app:", parsed);

        if (parsed.appKey === ids.appId) {
          removeMMKVKey(PENDING_TEMPLATE_KEY);

          console.log("[AiChat] Adding template creation message");
          chatActions.setMessages((prev) => {
            if (prev.length > 0) {
              return prev;
            }
            return [
              {
                text: parsed.message || "Created from template",
                role: "bot",
                updated: parsed.timestamp || Date.now(),
              },
            ];
          });
        } else {
          console.log("[AiChat] Pending template app key mismatch, skipping", {
            pendingAppKey: parsed.appKey,
            currentAppId: ids.appId,
          });
        }
      } catch (err) {
        console.error("[AiChat] Error checking pending template app:", err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [ids?.appId, hydrated]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        chatActions.persistNow();
      }
      if (
        nextState === "active" &&
        navState.current.layer === AI_CHAT_LAYERS.PREVIEW
      ) {
        chatActions.navigate({ layer: AI_CHAT_LAYERS.CHAT }, { replace: true });
      }
    });
    return () => subscription.remove();
  }, [activeLayer, navState]);

  const handleSendMessage = useCallback(
    (text, { source } = {}) => {
      if (!text || !text.trim()) return false;
      if (!sendMessage) return false;

      if (source === "dashboard") {
        chatActions.persistNow();
        chatActions.clearChat();
        chatActions.replaceIds({
          brandId: null,
          appId: null,
          screenId: null,
          sessionId: null,
          threadId: null,
        });
      }

      chatActions.setAppReadyInfo(null);
      chatActions.setDraft("chat", "");
      sendMessage(text);
      return true;
    },
    [sendMessage]
  );

  const clearMessages = useCallback(() => {
    chatActions.clearChat();
  }, []);

  const cachedAppMeta = ids.appId ? readAppMeta(ids.appId) : null;
  const cachedAppTitle = cachedAppMeta?.appName || null;
  const appTitle =
    appReadyInfo?.appName || cachedAppTitle || appConfig?.title || "Choicely";

  const previewAppKey = appReadyInfo?.appKey || ids.appId || appId || null;
  const previewEnabled = Boolean(previewAppKey && chatApi);

  const contextValue = useMemo(
    () => ({
      context,
      appConfig,
      startScreenId,
      configLoading,
      configError,
      authToken,
      tokenError,
      ids,
      hydrated,
      messages,
      suggestions,
      appReadyInfo,
      loading,
      error,
      verboseLog,
      navState,
      appTitle,
      cachedAppTitle,
      previewEnabled,
      previewAppKey,
      chatApi,
      handleSendMessage,
      clearMessages,
      pendingMessageTrigger,
      hasExplicitRoute,
    }),
    [
      context,
      appConfig,
      startScreenId,
      configLoading,
      configError,
      authToken,
      tokenError,
      ids,
      hydrated,
      messages,
      suggestions,
      appReadyInfo,
      loading,
      error,
      verboseLog,
      navState,
      appTitle,
      cachedAppTitle,
      previewEnabled,
      previewAppKey,
      chatApi,
      handleSendMessage,
      clearMessages,
      pendingMessageTrigger,
      hasExplicitRoute,
    ]
  );

  return (
    <AiChatContext.Provider value={contextValue}>
      {children}
    </AiChatContext.Provider>
  );
};

export const useAiChat = () => {
  const ctx = useContext(AiChatContext);
  if (!ctx) {
    throw new Error("useAiChat must be used within AiChatProvider");
  }
  return ctx;
};
