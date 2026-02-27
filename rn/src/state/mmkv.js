import { createMMKV } from "react-native-mmkv";

let storage = null;

export const getMMKV = () => {
  if (!storage) {
    storage = createMMKV({ id: "choicely_chat" });
  }
  return storage;
};

export const removeMMKVKey = (key) => {
  const mmkv = getMMKV();
  if (!mmkv || !key) return false;

  if (typeof mmkv.remove === "function") {
    return mmkv.remove(key);
  }

  if (typeof mmkv.delete === "function") {
    return mmkv.delete(key);
  }

  return false;
};
