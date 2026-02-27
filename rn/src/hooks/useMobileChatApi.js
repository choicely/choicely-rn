import { useCallback, useRef, useEffect } from "react";
import createEventSourceHandlers from "./eventSourceHandlers";
import {
  createApp,
  createScreen,
  fetchBrandAccess,
  fetchAppWithBrand,
} from "../services/ChoicelyApiService";
import { readAppMeta } from "../state/chatIdsCache";
import { useBrandManager } from "./useBrandManager";
import { createBridgeClient } from "../bridge/ChoicelyRNBridge";
import { BridgeEvents } from "../bridge/BridgeEvents";

// Configuration
const CONVO_SERVICE_URL = "https://convo.choicely.com";
// SSE is served by convo only.
const STREAM_BASE_URL = CONVO_SERVICE_URL;
const PREVIEW_DEBOUNCE_MS = 1500;
const SESSION_EXPIRED_ERROR_MESSAGE = "Session expired. Please sign in and send again.";
const ENABLE_STREAM_POST_FOR_ATTACHMENTS = false;

const hasValidUserInfo = (userInfo) =>
  Boolean(userInfo?.accessToken && userInfo?.userKey);

/**
 * Generates a unique ID for session/thread tracking
 */
const guid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r % 4) + 8;
    return v.toString(16);
  });
};

const computeThreadId = (sessionId, appId) =>
  `${sessionId}_${appId || "default"}`;

/**
 * Custom EventSource implementation using XMLHttpRequest for React Native
 * RN's fetch() does not support text streaming, so XHR is required.
 */
class RNEventSource {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.xhr = new XMLHttpRequest();
    this.onmessage = null;
    this.onerror = null;
    this.onopen = null;
    this.lastIndex = 0;
    this._lineBuffer = "";
    this._eventDataLines = [];
    this._didOpen = false;
    this._didEmitError = false;
    this._didComplete = false;
    this._didReceiveData = false;
    this._didReceiveDone = false;
    this._isClosed = false;
    this._start();
  }

  _dispatchOpen() {
    if (this._didOpen || this._isClosed) return;
    this._didOpen = true;
    if (this.onopen) {
      this.onopen();
    }
  }

  _dispatchError(error) {
    if (this._didEmitError || this._isClosed) return;
    this._didEmitError = true;
    if (this.onerror) {
      this.onerror(error);
    }
  }

  _createError(message, code, extra = {}) {
    const error = new Error(message);
    error.code = code;
    error.status = this.xhr?.status ?? 0;
    error.didOpen = this._didOpen;
    error.didReceiveData = this._didReceiveData;
    Object.assign(error, extra);
    return error;
  }

  _start() {
    const { method = "GET", headers = {}, body } = this.options;

    console.log(`[RNEventSource] Starting ${method} request to ${this.url}`);
    if (__DEV__) {
      console.log("[RNEventSource] Headers:", JSON.stringify(headers, null, 2));
      console.log("[RNEventSource] Body:", body);
    }

    this.xhr.open(method, this.url, true);

    // Set headers
    Object.keys(headers).forEach((key) => {
      this.xhr.setRequestHeader(key, headers[key]);
    });
    this.xhr.setRequestHeader("Accept", "text/event-stream");
    this.xhr.setRequestHeader("Cache-Control", "no-cache");

    // Handle progress (streaming)
    this.xhr.onprogress = () => {
      if (this.xhr.status >= 200 && this.xhr.status < 400) {
        this._dispatchOpen();
      }

      const response = this.xhr.responseText || "";
      if (response.length <= this.lastIndex) {
        return;
      }

      const chunk = response.slice(this.lastIndex);
      this.lastIndex = response.length;

      this._parseChunk(chunk);
    };

    // Handle initial connection open
    this.xhr.onreadystatechange = () => {
      if (this.xhr.readyState === 2) {
        // HEADERS_RECEIVED
        console.log(
          `[RNEventSource] Connection established. Status: ${this.xhr.status}`
        );
        if (this.xhr.status >= 400) {
          // Start reading response text if available
          const responseText = this.xhr.responseText || "";
          console.error(
            `[RNEventSource] Error Status: ${this.xhr.status} ${this.xhr.statusText}`
          );
          if (responseText) {
            console.error(
              `[RNEventSource] Server Error Response: ${responseText}`
            );
          }

          const errorMsg = `HTTP ${this.xhr.status} ${this.xhr.statusText}`;
          this._dispatchError(this._createError(errorMsg, "ERR_STREAM_HTTP"));
          // Don't abort immediately, let it finish so we might see body
        } else {
          this._dispatchOpen();
        }
      } else if (this.xhr.readyState === 4) {
        // DONE
        this._didComplete = true;
        const status = this.xhr.status;
        console.log(`[RNEventSource] Request complete. Status: ${status}`);
        const response = this.xhr.responseText || "";
        if (response.length > this.lastIndex) {
          const chunk = response.slice(this.lastIndex);
          this.lastIndex = response.length;
          this._parseChunk(chunk);
        }
        this._parseChunk("", true);

        if (status === 0) {
          this._dispatchError(
            this._createError(
              "Stream request failed before receiving a valid response (status 0)",
              "ERR_STREAM_STATUS_0"
            )
          );
        } else if (status >= 400) {
          const responseText = this.xhr.responseText || "";
          console.error(
            `[RNEventSource] Final Error Response: ${responseText}`
          );

          // If we failed with error, and haven't reported it yet
          const errorMsg = `HTTP ${status} ${this.xhr.statusText}`;
          this._dispatchError(this._createError(errorMsg, "ERR_STREAM_HTTP"));
        } else if (!this._didReceiveDone) {
          this._dispatchError(
            this._createError(
              `Stream ended without completion marker ([DONE]). Status: ${status}`,
              "ERR_STREAM_MISSING_DONE"
            )
          );
        }
      }
    };

    this.xhr.onerror = (e) => {
      if (this._isClosed || this._didEmitError) {
        return;
      }
      if (this._didComplete) {
        // React Native can emit an "error" event after DONE; avoid duplicate false alarms.
        return;
      }
      console.error("[RNEventSource] Network Error:", e);
      this._dispatchError(
        this._createError("Network request failed", "ERR_STREAM_NETWORK")
      );
    };

    this.xhr.send(body);
  }

  _emitEventData() {
    if (this._eventDataLines.length === 0) {
      return;
    }
    const data = this._eventDataLines.join("\n");
    this._didReceiveData = true;
    if (data.trim() === "[DONE]") {
      this._didReceiveDone = true;
    }
    this._eventDataLines = [];
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  _processLine(line) {
    if (line.endsWith("\r")) {
      line = line.slice(0, -1);
    }
    if (line.length === 0) {
      this._emitEventData();
      return;
    }
    if (line.startsWith(":")) {
      return;
    }
    if (line.startsWith("data:")) {
      const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
      this._eventDataLines.push(data);
    }
  }

  _parseChunk(chunk, flush = false) {
    if (chunk) {
      this._lineBuffer += chunk;
    }
    if (!this._lineBuffer && !flush) {
      return;
    }

    const lines = this._lineBuffer.split("\n");
    this._lineBuffer = flush ? "" : lines.pop() || "";
    for (const line of lines) {
      this._processLine(line);
    }

    if (flush) {
      if (this._lineBuffer) {
        this._processLine(this._lineBuffer);
        this._lineBuffer = "";
      }
      this._emitEventData();
    }
  }

  close() {
    console.log("[RNEventSource] Closing connection");
    this._isClosed = true;
    this.xhr.abort();
  }
}

const useMobileChatApi = (token, ids, chatState) => {
  const { getUserBrandKey } = useBrandManager();
  const sessionIdRef = useRef(ids?.sessionId || guid());
  const activeEventSourceRef = useRef(null);
  const lastStreamAppKeyRef = useRef(null);
  const lastStreamAppNameRef = useRef(null);
  const lastPreviewedAppKeyRef = useRef(null);
  const lastPreviewRequestAtRef = useRef(0);
  const idsRef = useRef(ids);

  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  useEffect(() => {
    if (!ids?.sessionId) {
      if (typeof chatState.setIds === "function") {
        chatState.setIds({ sessionId: sessionIdRef.current });
      }
    } else if (ids.sessionId !== sessionIdRef.current) {
      sessionIdRef.current = ids.sessionId;
    }
  }, [ids?.sessionId, chatState]);

  const threadId =
    ids?.threadId || computeThreadId(sessionIdRef.current, ids?.appId);

  useEffect(() => {
    if (threadId && ids?.threadId !== threadId) {
      if (typeof chatState.setIds === "function") {
        chatState.setIds({ threadId });
      }
    }
  }, [threadId, ids?.threadId, chatState]);

  const runWithBridgeClient = useCallback(async (runner) => {
    const bridge = createBridgeClient();
    try {
      return await runner(bridge);
    } finally {
      bridge.destroy();
    }
  }, []);

  const openAppPreview = useCallback(async (appKey) => {
    if (!appKey) {
      return;
    }
    const now = Date.now();
    const isDuplicateRequest =
      lastPreviewedAppKeyRef.current === appKey &&
      now - lastPreviewRequestAtRef.current < PREVIEW_DEBOUNCE_MS;
    if (isDuplicateRequest) {
      return;
    }
    lastPreviewedAppKeyRef.current = appKey;
    lastPreviewRequestAtRef.current = now;

    try {
      await runWithBridgeClient(async (bridge) => {
        await bridge.request(BridgeEvents.APP_LOAD, { appKey }); // bridge-lint-ignore: event name constant defined in BridgeEvents
      });
    } catch (error) {
      console.error("[useMobileChatApi] Failed to open app preview:", error);
    }
  }, [runWithBridgeClient]);

  const handleStreamAppKey = useCallback(async ({ appKey, appName }) => {
    if (!appKey) {
      return;
    }

    lastStreamAppKeyRef.current = appKey;

    if (!appName || lastStreamAppNameRef.current === appName) {
      return;
    }

    lastStreamAppNameRef.current = appName;
    console.log("[useMobileChatApi] stream app key/name", {
      appKey,
      appName,
    });

    try {
      await runWithBridgeClient(async (bridge) => {
        await bridge.request(BridgeEvents.APP_STORE, { // bridge-lint-ignore: event name constant defined in BridgeEvents
          appKey,
          title: appName,
          updated: Date.now(),
        });
      });
    } catch (error) {
      console.error("[useMobileChatApi] Failed to update app title:", error);
    }
  }, [runWithBridgeClient]);

  const handleStreamDone = useCallback(() => {
    const appKey = lastStreamAppKeyRef.current || idsRef.current?.appId;
    if (!appKey) {
      return;
    }

    if (typeof chatState.onAppReady === "function") {
      chatState.onAppReady({
        appKey,
        appName: lastStreamAppNameRef.current || null,
      });
    }
  }, [chatState]);

  const threadIdRef = useRef(threadId);
  const streamKeyRef = useRef(0);

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const { onMessage, onError } = createEventSourceHandlers({
    threadId,
    getThreadId: () => threadIdRef.current,
    getStreamKey: () => streamKeyRef.current,
    setMessages: chatState.setMessages,
    setLoading: chatState.setLoading,
    setError: chatState.setError,
    setVerboseLog: chatState.setVerboseLog,
    setRenderState: chatState.setRenderState,
    updateSuggestions: chatState.updateSuggestions,
    onDone: handleStreamDone,
    onAppKey: handleStreamAppKey,
  });

  const abortRequest = useCallback(() => {
    if (activeEventSourceRef.current) {
      activeEventSourceRef.current.close();
      activeEventSourceRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    async (userMessage) => {
      console.log("[useMobileChatApi] sendMessage called with:", userMessage);

      // Abort any existing request first
      if (activeEventSourceRef.current) {
        activeEventSourceRef.current.close();
        activeEventSourceRef.current = null;
      }

      if (!token) {
        console.log("[useMobileChatApi] No token, aborting");
        chatState.setError("Not authenticated. Please try again.");
        return;
      }

      // Read IDs from the latest store state when available to avoid
      // stale refs during dashboard -> new chat transitions.
      const liveIds =
        (typeof chatState.getIds === "function" && chatState.getIds()) ||
        idsRef.current ||
        null;

      if (liveIds?.sessionId && liveIds.sessionId !== sessionIdRef.current) {
        sessionIdRef.current = liveIds.sessionId;
      }

      let currentBrandId = liveIds?.brandId ?? null;
      let currentAppId = liveIds?.appId ?? null;
      let currentScreenId = liveIds?.screenId ?? null;
      const initialThreadId = computeThreadId(
        sessionIdRef.current,
        currentAppId
      );
      streamKeyRef.current = Date.now();

      chatState.setMessages((prev) => [
        ...prev,
        {
          text: userMessage,
          role: "user",
          updated: Date.now(),
          threadId: initialThreadId,
        },
      ]);
      chatState.setError(null);
      chatState.setVerboseLog(null);
      chatState.setSuggestions([]);
      chatState.setLoading(true);
      lastStreamAppKeyRef.current = null;
      lastStreamAppNameRef.current = null;
      let didHandleSessionExpired = false;

      try {
        const handleSessionExpired = async (bridge, reason, error = null) => {
          if (didHandleSessionExpired) {
            return;
          }
          didHandleSessionExpired = true;
          console.warn(
            "[useMobileChatApi] Session expired during context resolution",
            {
              reason,
              status: error?.status ?? null,
              message: error?.message ?? null,
            }
          );
          chatState.setError(SESSION_EXPIRED_ERROR_MESSAGE);
          chatState.setLoading(false);
          chatState.updateSuggestions("error");
          try {
            await bridge.request(BridgeEvents.AUTH_OPEN_LOGIN); // bridge-lint-ignore: event name constant defined in BridgeEvents
          } catch (loginError) {
            console.error("[useMobileChatApi] Failed to open login:", loginError);
          }
        };

        // Check if we need to initialize a brand/app (new chat only)
        if (!currentAppId) {
          console.log(
            "[useMobileChatApi] No brand/app, initializing new chat..."
          );

          await runWithBridgeClient(async (bridge) => {
            const userInfo = await bridge.request(BridgeEvents.AUTH_GET_USER_INFO); // bridge-lint-ignore: event name constant defined in BridgeEvents
            console.log("[useMobileChatApi] Got user info:", userInfo.userKey);

            // Reuse cached brand (or create once) and create a fresh app
            const {
              brandKey,
              providerKey,
              firebaseProjectKey,
            } = await getUserBrandKey(userInfo);
            currentBrandId = currentBrandId || brandKey;

            const screen = await createScreen(userInfo.accessToken, currentBrandId);
            currentScreenId = screen?.key || null;

            const app = await createApp(
              userInfo.accessToken,
              currentBrandId,
              currentScreenId,
              providerKey,
              firebaseProjectKey
            );

            currentAppId = app?.key || null;

            if (typeof chatState.setIds === "function") {
              chatState.setIds({
                brandId: currentBrandId,
                appId: currentAppId,
                screenId: currentScreenId,
              });
            }

            console.log("[useMobileChatApi] Chat initialized with brand/app:", {
              brandId: currentBrandId,
              appId: currentAppId,
              screenId: currentScreenId,
            });

            try {
              await bridge.request(BridgeEvents.APP_STORE, { // bridge-lint-ignore: event name constant defined in BridgeEvents
                appKey: currentAppId,
                title: app?.title || "Untitled app",
                updated: Date.now(),
              });
            } catch (error) {
              console.error("[useMobileChatApi] Failed to store app:", error);
            }
          });
        }

        if (currentAppId && (!currentScreenId || !currentBrandId)) {
          const cached = readAppMeta(currentAppId);
          if (cached) {
            currentBrandId = currentBrandId || cached.brandId;
            currentScreenId = currentScreenId || cached.screenId;
          }
        }

        let userInfo = null;
        if (currentAppId && !currentBrandId) {
          try {
            await runWithBridgeClient(async (bridge) => {
              userInfo = await bridge.request(BridgeEvents.AUTH_GET_USER_INFO); // bridge-lint-ignore: event name constant defined in BridgeEvents
              if (!hasValidUserInfo(userInfo)) {
                await handleSessionExpired(
                  bridge,
                  "missing auth identity while resolving brand"
                );
                return;
              }
              const brands = await fetchBrandAccess(
                userInfo.accessToken,
                userInfo.userKey,
                currentAppId,
                { throwOnError: true }
              );
              if (Array.isArray(brands) && brands.length > 0) {
                currentBrandId = brands[0];
                if (typeof chatState.setIds === "function") {
                  chatState.setIds({ brandId: currentBrandId });
                }
              }
            });
            if (didHandleSessionExpired) {
              activeEventSourceRef.current = null;
              return;
            }
          } catch (error) {
            if (error?.status === 401) {
              await runWithBridgeClient(async (bridge) => {
                await handleSessionExpired(
                  bridge,
                  "check_brand_access unauthorized",
                  error
                );
              });
              activeEventSourceRef.current = null;
              return;
            }
            console.error(
              "[useMobileChatApi] check_brand_access error:",
              error
            );
          }
        }

        if (currentAppId && currentBrandId && !currentScreenId) {
          try {
            if (!userInfo) {
              await runWithBridgeClient(async (bridge) => {
                userInfo = await bridge.request(BridgeEvents.AUTH_GET_USER_INFO); // bridge-lint-ignore: event name constant defined in BridgeEvents
                if (!hasValidUserInfo(userInfo)) {
                  await handleSessionExpired(
                    bridge,
                    "missing auth identity while resolving screen"
                  );
                }
              });
              if (didHandleSessionExpired) {
                activeEventSourceRef.current = null;
                return;
              }
            }
            const appPayload = await fetchAppWithBrand(
              userInfo?.accessToken,
              currentAppId,
              currentBrandId
            );
            const resolvedScreenId =
              appPayload?.screen_key ||
              appPayload?.screenKey ||
              appPayload?.screen?.key ||
              appPayload?.default_nav_item?.screen_key ||
              appPayload?.default_nav_item?.screenKey ||
              appPayload?.screens?.[0]?.key ||
              appPayload?.main_screen?.key ||
              appPayload?.screen_id ||
              null;
            if (resolvedScreenId) {
              currentScreenId = resolvedScreenId;
              if (typeof chatState.setIds === "function") {
                chatState.setIds({ screenId: currentScreenId });
              }
            } else if (appPayload) {
              console.log(
                "[useMobileChatApi] App payload missing screen id",
                appPayload
              );
            }
          } catch (error) {
            console.error("[useMobileChatApi] fetch app error:", error);
          }
        }

        console.log("[useMobileChatApi] Using IDs:", {
          currentBrandId,
          currentAppId,
          currentScreenId,
        });

        if (!currentScreenId) {
          chatState.setError(
            "Missing screen ID for this app. Please reopen the app or try again."
          );
          chatState.setLoading(false);
          return;
        }

        // TODO: Switch attachment-bearing requests to POST /chat/stream once
        // convo backend contract is confirmed. Base64 data URIs can exceed
        // safe query-string limits.
        const currentThreadId = computeThreadId(
          sessionIdRef.current,
          currentAppId
        );
        threadIdRef.current = currentThreadId;

        if (currentThreadId !== initialThreadId) {
          chatState.setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "user" || last.text !== userMessage) {
              return prev;
            }
            return [
              ...prev.slice(0, -1),
              { ...last, threadId: currentThreadId },
            ];
          });
        }

        const streamPayload = {
          brand_id: currentBrandId,
          app_id: currentAppId || "",
          thread_id: currentThreadId,
          screen_id: currentScreenId || "",
          message: userMessage,
        };
        const hasEmbeddedAttachmentData =
          typeof userMessage === "string" && userMessage.includes(";base64,");
        const streamUrl = `${STREAM_BASE_URL}/chat/stream`;
        const shouldUsePost = ENABLE_STREAM_POST_FOR_ATTACHMENTS &&
          hasEmbeddedAttachmentData;
        const params = new URLSearchParams(streamPayload);
        const urlWithParams = `${streamUrl}?${params.toString()}`;

        if (!shouldUsePost && hasEmbeddedAttachmentData) {
          console.warn(
            "[useMobileChatApi] Attachment base64 detected while stream POST mode is disabled."
          );
        }
        if (__DEV__) {
          console.log(
            "[useMobileChatApi] Stream request mode:",
            shouldUsePost ? "POST" : "GET"
          );
        }
        const normalizeStreamError = (errorLike) => {
          if (errorLike instanceof Error) {
            return errorLike;
          }
          const message =
            typeof errorLike?.message === "string" &&
            errorLike.message.trim().length > 0
              ? errorLike.message
              : "Streaming error occurred";
          const error = new Error(message);
          if (typeof errorLike?.status === "number") {
            error.status = errorLike.status;
          }
          if (typeof errorLike?.code === "string") {
            error.code = errorLike.code;
          }
          if (typeof errorLike?.didOpen === "boolean") {
            error.didOpen = errorLike.didOpen;
          }
          if (typeof errorLike?.didReceiveData === "boolean") {
            error.didReceiveData = errorLike.didReceiveData;
          }
          return error;
        };
        // Use custom XHR-based EventSource for RN streaming support
        const eventSource = shouldUsePost
          ? new RNEventSource(streamUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(streamPayload),
          })
          : new RNEventSource(urlWithParams, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

        activeEventSourceRef.current = eventSource;
        eventSource.onmessage = (event) => onMessage(eventSource, event);
        eventSource.onerror = (errorLike) => {
          const error = normalizeStreamError(errorLike);
          onError(eventSource, error);
          activeEventSourceRef.current = null;
        };

        if (__DEV__) {
          console.log("[useMobileChatApi] Stream auth token present:", Boolean(token));
        }
      } catch (err) {
        if (didHandleSessionExpired) {
          activeEventSourceRef.current = null;
          return;
        }
        console.error("sendMessage error:", err);
        chatState.setError(err.message);
        chatState.setLoading(false);
        chatState.updateSuggestions("error");
        activeEventSourceRef.current = null;
      }
    },
    [token, onMessage, onError, chatState, getUserBrandKey, runWithBridgeClient]
  );

  return {
    sendMessage,
    abortRequest,
    threadId,
    openAppPreview,
  };
};

export default useMobileChatApi;
