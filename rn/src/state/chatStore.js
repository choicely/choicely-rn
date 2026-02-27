import { useSyncExternalStore } from "react";
import { createDefaultNavState, createInitialState, trimMessages } from "./chatSchema";
import {
  buildContextKey,
  setLastSessionKey,
} from "./chatKeys";
import { getMMKV } from "./mmkv";
import { loadSnapshot, saveSnapshot } from "./chatPersist";
import { readAppMeta, writeAppMeta } from "./chatIdsCache";

const storage = getMMKV();

const guid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r % 4) + 8;
    return v.toString(16);
  });

const computeThreadId = (sessionId, appId) =>
  `${sessionId}_${appId || "default"}`;

const createNavState = (route) => ({
  current: { route, layer: "chat" },
  history: [{ route, layer: "chat" }],
});

const isSameNavState = (a, b) =>
  a && b && a.route === b.route && a.layer === b.layer;

const navReducer = (state, action) => {
  switch (action.type) {
    case "NAVIGATE": {
      const next = { ...state.current, ...action.payload };
      const last = state.history[state.history.length - 1];
      if (isSameNavState(last, next)) {
        return state;
      }
      let history = action.replace
        ? [...state.history.slice(0, -1), next]
        : [...state.history, next];
      if (history.length > 1) {
        const tail = history[history.length - 1];
        const prev = history[history.length - 2];
        if (isSameNavState(tail, prev)) {
          history = history.slice(0, -1);
        }
      }
      return { current: history[history.length - 1], history };
    }
    case "BACK": {
      if (state.history.length <= 1) return state;
      const history = state.history.slice(0, -1);
      return { current: history[history.length - 1], history };
    }
    default:
      return state;
  }
};

let state = createInitialState();
let listeners = new Set();
let activeKey = null;
let hydratedKey = null;
let persistTimer = null;
let messageIdCounter = 0;
const debugState = () => {
  const { ids, chat, nav } = state;
  const cached = ids?.appId ? readAppMeta(ids.appId) : null;
  return {
    appId: ids?.appId || null,
    brandId: ids?.brandId || null,
    screenId: ids?.screenId || null,
    threadId: ids?.threadId || null,
    messages: chat?.messages?.length || 0,
    currentRoute: nav?.current?.route || null,
    cachedAppName: cached?.appName || null,
  };
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

const schedulePersist = () => {
  // Cancel any pending persist - we'll schedule a new one with current state
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!activeKey) return;
  if (!state?.ids?.appId) return;
  // Capture key and state NOW, not when the timer fires
  // This prevents race conditions when switching apps during the debounce window
  const keyToSave = activeKey;
  const stateToSave = state;
  persistTimer = setTimeout(() => {
    // Verify key still matches state's appId before saving
    const expectedKey = buildContextKey({ appId: stateToSave.ids?.appId });
    if (keyToSave !== expectedKey) {
      console.warn("[chatStore] schedulePersist: key mismatch, skipping save", {
        keyToSave,
        expectedKey,
        currentActiveKey: activeKey,
      });
      persistTimer = null;
      return;
    }
    saveSnapshot(keyToSave, stateToSave);
    persistTimer = null;
  }, 500);
};

const setState = (updater, options = {}) => {
  const next = typeof updater === "function" ? updater(state) : updater;
  state = next;
  notify();
  if (options.persist !== false) {
    schedulePersist();
  }
};

const ensureMessageIds = (messages) =>
  messages.map((message) => {
    if (message?.id) return message;
    messageIdCounter += 1;
    return { ...message, id: `msg_${messageIdCounter}` };
  });

const ensureIds = (ids) => {
  const next = { ...ids };
  if (!next.sessionId) {
    next.sessionId = guid();
  }
  next.threadId = computeThreadId(next.sessionId, next.appId);
  return next;
};

const applyContextKey = (ids) => {
  if (!ids?.appId) {
    if (activeKey || hydratedKey) {
      activeKey = null;
      hydratedKey = null;
    }
    return;
  }
  const nextKey = buildContextKey({ appId: ids.appId });
  if (nextKey !== activeKey) {
    activeKey = nextKey;
    setLastSessionKey(storage, nextKey);
  }
};

export const chatActions = {
  hydrateForContext: ({ brandId, appId, screenId }) => {
    if (!appId) return;
    // Cancel any pending persist from previous context to prevent race conditions
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const key = buildContextKey({ appId });
    console.log("[chatStore] hydrateForContext requested", {
      appId,
      brandId,
      screenId,
      key,
    });
    let snapshot = loadSnapshot(key);
    if (hydratedKey === key) return;

    if (!snapshot) {
      console.log("[chatStore] hydrateForContext no snapshot, using initial", { key });
    } else {
      console.log("[chatStore] hydrateForContext loaded snapshot", { key });
    }
    const base = snapshot || createInitialState();
    const ids = ensureIds({
      ...base.ids,
      brandId: brandId ?? base.ids.brandId,
      appId: appId ?? base.ids.appId,
      screenId: screenId ?? base.ids.screenId,
    });

    state = {
      ...base,
      ids,
      hydrated: true,
      meta: { ...base.meta },
    };

    activeKey = key;
    hydratedKey = key;
    setLastSessionKey(storage, key);
    const messageSample = (state.chat?.messages || []).slice(0, 2).map((msg) => ({
      role: msg.role,
      text: typeof msg.text === "string" ? msg.text.slice(0, 80) : "",
      updated: msg.updated,
    }));
    console.log("[chatStore] hydrated state", {
      key,
      ...debugState(),
      messageSample,
    });
    notify();
  },
  persistNow: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (!activeKey) return;
    if (!state?.ids?.appId) return;
    const expectedKey = buildContextKey({ appId: state.ids.appId });
    if (expectedKey !== activeKey) {
      console.warn("[chatStore] persistNow: key mismatch, skipping save", {
        keyToSave: activeKey,
        expectedKey,
      });
      return;
    }
    saveSnapshot(activeKey, state);
  },
  setIds: (partial) => {
    setState((prev) => {
      const ids = ensureIds({ ...prev.ids, ...partial });
      if (ids.appId && (ids.brandId || ids.screenId)) {
        writeAppMeta(ids.appId, {
          brandId: ids.brandId,
          screenId: ids.screenId,
        });
      }
      applyContextKey(ids);
      return { ...prev, ids };
    });
  },
  replaceIds: (nextIds) => {
    setState((prev) => {
      const ids = ensureIds({ ...nextIds });
      if (ids.appId && (ids.brandId || ids.screenId)) {
        writeAppMeta(ids.appId, {
          brandId: ids.brandId,
          screenId: ids.screenId,
        });
      }
      applyContextKey(ids);
      return { ...prev, ids };
    });
  },
  navigate: (payload, options = {}) => {
    setState((prev) => ({
      ...prev,
      nav: navReducer(prev.nav, {
        type: "NAVIGATE",
        payload,
        replace: options.replace,
      }),
    }));
  },
  goBack: () => {
    setState((prev) => ({
      ...prev,
      nav: navReducer(prev.nav, { type: "BACK" }),
    }));
  },
  setMessages: (update) => {
    setState((prev) => {
      const nextMessages =
        typeof update === "function" ? update(prev.chat.messages) : update;
      const nextWithIds = ensureMessageIds(nextMessages);
      return {
        ...prev,
        chat: { ...prev.chat, messages: trimMessages(nextWithIds) },
      };
    });
  },
  setSuggestions: (suggestions) => {
    setState((prev) => ({
      ...prev,
      chat: { ...prev.chat, suggestions: Array.isArray(suggestions) ? suggestions : [] },
    }));
  },
  updateSuggestions: (value) => {
    if (Array.isArray(value)) {
      chatActions.setSuggestions(value);
      return;
    }
    if (value === "error" || value === "finalize") {
      chatActions.setSuggestions([]);
    }
  },
  setAppReadyInfo: (info) => {
    setState((prev) => ({
      ...prev,
      chat: { ...prev.chat, appReadyInfo: info },
    }));
  },
  clearChat: () => {
    setState((prev) => ({
      ...prev,
      nav: createDefaultNavState("home"),
      chat: { ...prev.chat, messages: [], suggestions: [], appReadyInfo: null },
      drafts: { ...prev.drafts, dashboard: "", chat: "" },
      volatile: { ...prev.volatile, error: null, verboseLog: null, loading: false },
    }));
  },
  setDraft: (key, value) => {
    setState((prev) => ({
      ...prev,
      drafts: { ...prev.drafts, [key]: value },
    }));
  },
  setLoading: (loading) => {
    setState((prev) => ({
      ...prev,
      volatile: { ...prev.volatile, loading },
    }), { persist: false });
  },
  setError: (error) => {
    setState((prev) => ({
      ...prev,
      volatile: { ...prev.volatile, error },
    }), { persist: false });
  },
  setVerboseLog: (verboseLog) => {
    setState((prev) => ({
      ...prev,
      volatile: { ...prev.volatile, verboseLog },
    }), { persist: false });
  },
  setRenderState: () => {
    setState((prev) => ({
      ...prev,
      volatile: { ...prev.volatile, renderNonce: Date.now() },
    }), { persist: false });
  },
  resetNav: (route = "home") => {
    setState((prev) => ({
      ...prev,
      nav: createNavState(route),
    }));
  },
};

export const useChatStore = (selector) =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => selector(state),
    () => selector(state)
  );

export const getChatState = () => state;
