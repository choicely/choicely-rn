import { getMMKV } from "./mmkv";
import {
  CHAT_STATE_VERSION,
  createInitialState,
  trimMessages,
} from "./chatSchema";
import { buildContextKey } from "./chatKeys";

const storage = getMMKV();

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    return createInitialState();
  }

  return {
    version: snapshot.version || CHAT_STATE_VERSION,
    hydrated: true,
    nav: snapshot.nav || createInitialState().nav,
    chat: {
      messages: trimMessages(normalizeArray(snapshot.chat?.messages)),
      suggestions: normalizeArray(snapshot.chat?.suggestions),
      appReadyInfo: snapshot.chat?.appReadyInfo || null,
    },
    drafts: {
      dashboard: snapshot.drafts?.dashboard || "",
      chat: snapshot.drafts?.chat || "",
    },
    ids: {
      brandId: snapshot.ids?.brandId || null,
      appId: snapshot.ids?.appId || null,
      screenId: snapshot.ids?.screenId || null,
      sessionId: snapshot.ids?.sessionId || null,
      threadId: snapshot.ids?.threadId || null,
    },
    volatile: {
      loading: false,
      error: null,
      verboseLog: null,
      renderNonce: null,
    },
    meta: {
      lastUpdated: snapshot.meta?.lastUpdated || Date.now(),
    },
  };
};

export const loadSnapshot = (key) => {
  if (!key) return null;
  try {
    const raw = storage.getString(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeSnapshot(parsed);
  } catch (error) {
    console.warn("[chatPersist] Failed to load snapshot", error);
    return null;
  }
};

export const persistableState = (state) => ({
  version: CHAT_STATE_VERSION,
  nav: state.nav,
  chat: {
    messages: trimMessages(state.chat?.messages || []),
    suggestions: normalizeArray(state.chat?.suggestions),
    appReadyInfo: state.chat?.appReadyInfo || null,
  },
  drafts: {
    dashboard: state.drafts?.dashboard || "",
    chat: state.drafts?.chat || "",
  },
  ids: {
    brandId: state.ids?.brandId || null,
    appId: state.ids?.appId || null,
    screenId: state.ids?.screenId || null,
    sessionId: state.ids?.sessionId || null,
    threadId: state.ids?.threadId || null,
  },
  meta: {
    lastUpdated: Date.now(),
  },
});

export const saveSnapshot = (key, state) => {
  if (!key) return;
  try {
    const persistable = persistableState(state);
    if (!persistable.ids?.appId) return;
    const expectedKey = buildContextKey({ appId: persistable.ids.appId });
    if (key !== expectedKey) {
      console.warn("[chatPersist] KEY MISMATCH!", {
        saveKey: key,
        expectedKey,
        appId: persistable.ids?.appId,
      });
    }
    console.log("[chatPersist] saveSnapshot", {
      key,
      appId: persistable.ids?.appId,
      messageCount: persistable.chat?.messages?.length || 0,
    });
    storage.set(key, JSON.stringify(persistable));
  } catch (error) {
    console.warn("[chatPersist] Failed to save snapshot", error);
  }
};
