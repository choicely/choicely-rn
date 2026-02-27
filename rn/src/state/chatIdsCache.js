import { getMMKV } from "./mmkv";

const storage = getMMKV();
const KEY_PREFIX = "choicely:rn:app_meta";

const buildKey = (appId) => (appId ? `${KEY_PREFIX}:${appId}` : null);
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export const readAppMeta = (appId) => {
  const key = buildKey(appId);
  if (!key) return null;
  try {
    const raw = storage.getString(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (error) {
    console.warn("[chatIdsCache] Failed to read app meta", error);
    return null;
  }
};

export const writeAppMeta = (appId, meta) => {
  const key = buildKey(appId);
  if (!key || !meta || typeof meta !== "object") return;
  try {
    const existing = readAppMeta(appId) || {};
    storage.set(
      key,
      JSON.stringify({
        brandId: hasOwn(meta, "brandId")
          ? meta.brandId || null
          : existing.brandId || null,
        screenId: hasOwn(meta, "screenId")
          ? meta.screenId || null
          : existing.screenId || null,
        appName: hasOwn(meta, "appName")
          ? meta.appName || null
          : existing.appName || null,
        updated: Date.now(),
      })
    );
  } catch (error) {
    console.warn("[chatIdsCache] Failed to write app meta", error);
  }
};
