import { Platform } from "react-native";

const IOS = "ios";
const ANDROID = "android";

function createPickerError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeFileName(actionId, asset) {
  if (typeof asset?.fileName === "string" && asset.fileName.trim()) {
    return asset.fileName.trim();
  }
  if (typeof asset?.uri === "string" && asset.uri.trim()) {
    const uri = asset.uri.trim();
    const parts = uri.split("/");
    const last = parts[parts.length - 1];
    if (last) {
      return last;
    }
  }
  if (actionId === "camera") {
    return `camera_${Date.now()}.jpg`;
  }
  if (actionId === "files") {
    return `file_${Date.now()}`;
  }
  return `photo_${Date.now()}.jpg`;
}

function resolveErrorCode(actionId) {
  return actionId === "files" ? "ERR_FILE_PICKER" : "ERR_IMAGE_PICKER";
}

function resolveCancelledMessage(actionId) {
  if (actionId === "camera") {
    return "Camera selection cancelled";
  }
  if (actionId === "files") {
    return "File selection cancelled";
  }
  return "Image selection cancelled";
}

function buildPayload(actionId, asset) {
  const fileName = normalizeFileName(actionId, asset);
  const uri = typeof asset?.uri === "string" ? asset.uri : null;
  const base64 = typeof asset?.base64 === "string" ? asset.base64 : null;
  const mimeType = typeof asset?.type === "string" ? asset.type : null;
  const key = fileName || uri || `${actionId}_${Date.now()}`;

  if (actionId === "files") {
    return {
      type: "file",
      source: "files",
      name: fileName,
      fileName,
      key,
      fileKey: key,
      mimeType,
      data: base64,
      url: uri,
      uri,
      downloadUrl: uri,
    };
  }

  return {
    type: "image",
    source: actionId === "camera" ? "camera" : "photos",
    name: fileName,
    fileName,
    key,
    imageKey: key,
    mimeType: mimeType || "image/jpeg",
    data: base64,
    url: uri,
    uri,
  };
}

function resolvePickerOptions(actionId) {
  if (actionId === "camera") {
    return {
      mediaType: "photo",
      includeBase64: false,
      selectionLimit: 1,
      quality: 0.8,
      saveToPhotos: false,
    };
  }
  if (actionId === "files") {
    return {
      mediaType: "mixed",
      includeBase64: false,
      selectionLimit: 1,
      quality: 0.8,
    };
  }
  return {
    mediaType: "photo",
    includeBase64: false,
    selectionLimit: 1,
    quality: 0.8,
  };
}

function loadImagePickerModule() {
  try {
    return require("react-native-image-picker");
  } catch (error) {
    return null;
  }
}

export function canUseRnContextPicker() {
  if (Platform.OS !== IOS && Platform.OS !== ANDROID) {
    return false;
  }
  const picker = loadImagePickerModule();
  return Boolean(
    picker &&
      typeof picker.launchCamera === "function" &&
      typeof picker.launchImageLibrary === "function"
  );
}

export async function pickContextAttachment(actionId) {
  if (!canUseRnContextPicker()) {
    throw createPickerError(
      "ERR_UNSUPPORTED_PICKER",
      "RN context picker is not available on this platform"
    );
  }

  const picker = loadImagePickerModule();
  const launch = actionId === "camera"
    ? picker.launchCamera
    : picker.launchImageLibrary;
  const options = resolvePickerOptions(actionId);
  const result = await launch(options);

  if (result?.didCancel) {
    throw createPickerError("ERR_CANCELLED", resolveCancelledMessage(actionId));
  }
  if (result?.errorCode) {
    const errorMessage =
      typeof result?.errorMessage === "string" && result.errorMessage.trim()
        ? result.errorMessage
        : "Unable to open picker";
    throw createPickerError(resolveErrorCode(actionId), errorMessage);
  }

  const assets = Array.isArray(result?.assets) ? result.assets : [];
  const firstAsset = assets[0];
  if (!firstAsset) {
    throw createPickerError(
      resolveErrorCode(actionId),
      "No asset returned from picker"
    );
  }
  return buildPayload(actionId, firstAsset);
}
