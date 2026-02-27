const KEY_PREFIX = "choicely:rn:chat";
const LAST_SESSION_KEY = "choicely:rn:last_session";

const safe = (value) => (value ? String(value) : "unknown");

export const buildContextKey = ({ appId }) =>
  `${KEY_PREFIX}:${safe(appId)}`;

export const getLastSessionKey = (storage) =>
  storage.getString(LAST_SESSION_KEY) || null;

export const setLastSessionKey = (storage, key) => {
  storage.set(LAST_SESSION_KEY, key);
};
