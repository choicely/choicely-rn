export const CHAT_STATE_VERSION = 1;
export const MAX_MESSAGES = 200;

export const createDefaultNavState = (route = "home") => ({
  current: { route, layer: "chat" },
  history: [{ route, layer: "chat" }],
});

export const trimMessages = (messages) => {
  if (!Array.isArray(messages)) return [];
  if (messages.length <= MAX_MESSAGES) return messages;
  return messages.slice(-MAX_MESSAGES);
};

export const createInitialState = (overrides = {}) => ({
  version: CHAT_STATE_VERSION,
  hydrated: false,
  nav: createDefaultNavState(),
  chat: {
    messages: [],
    suggestions: [],
    appReadyInfo: null,
  },
  drafts: {
    dashboard: "",
    chat: "",
  },
  ids: {
    brandId: null,
    appId: null,
    screenId: null,
    sessionId: null,
    threadId: null,
  },
  volatile: {
    loading: false,
    error: null,
    verboseLog: null,
    renderNonce: null,
  },
  meta: {
    lastUpdated: Date.now(),
  },
  ...overrides,
});
