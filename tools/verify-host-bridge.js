#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const RN_REPO_ROOT = path.resolve(__dirname, "..");

function resolvePathCandidates(relativeCandidates) {
  for (const relativePath of relativeCandidates) {
    const candidatePath = path.resolve(RN_REPO_ROOT, relativePath);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  return path.resolve(RN_REPO_ROOT, relativeCandidates[0]);
}

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${toRepoRelative(filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function toRepoRelative(filePath) {
  return path.relative(RN_REPO_ROOT, filePath).split(path.sep).join("/");
}

function toDisplayPath(filePath) {
  if (filePath.startsWith(RN_REPO_ROOT)) {
    return toRepoRelative(filePath);
  }
  return filePath;
}

function findExistingAndroidArtifacts() {
  const candidates = [
    "../../app/build/outputs/apk/debug/app-debug.apk",
    "../../app/build/outputs/apk/release/app-release.apk",
    "../../choicely-sdk/build/outputs/aar/choicely-sdk-debug.aar",
    "../../choicely-sdk/build/outputs/aar/choicely-sdk-release.aar",
  ];
  const existing = [];
  for (const relativePath of candidates) {
    const candidate = path.resolve(RN_REPO_ROOT, relativePath);
    if (fs.existsSync(candidate)) {
      existing.push(candidate);
    }
  }
  return existing;
}

function assertRegex({ content, regex, message, file, failures, stats }) {
  if (!regex.test(content)) {
    failures.push(`- ${toRepoRelative(file)}: ${message}`);
    return;
  }
  stats.passed += 1;
}

function assertCondition({ condition, message, file, failures, stats }) {
  if (!condition) {
    failures.push(`- ${toRepoRelative(file)}: ${message}`);
    return;
  }
  stats.passed += 1;
}

function main() {
  const files = {
    dashboard: resolvePathCandidates(["rn/src/components/Dashboard.js"]),
    bridgeClient: resolvePathCandidates(["rn/src/bridge/ChoicelyRNBridge.js"]),
    bridgeEvent: resolvePathCandidates([
      "../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeEvent.java",
      "../../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeEvent.java",
      "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeEvent.java",
    ]),
    bridgeKeys: resolvePathCandidates([
      "../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeKeys.java",
      "../../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeKeys.java",
      "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeKeys.java",
    ]),
    universalBridge: resolvePathCandidates([
      "../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyUniversalBridge.java",
      "../../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyUniversalBridge.java",
      "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyUniversalBridge.java",
    ]),
    authHandler: resolvePathCandidates([
      "../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAuthEventHandler.java",
      "../../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAuthEventHandler.java",
      "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAuthEventHandler.java",
    ]),
    navigationHandler: resolvePathCandidates([
      "../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeNavigationHandler.java",
      "../../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeNavigationHandler.java",
      "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeNavigationHandler.java",
    ]),
    appHandler: resolvePathCandidates([
      "../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAppEventHandler.java",
      "../../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAppEventHandler.java",
      "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAppEventHandler.java",
    ]),
    transferHandler: resolvePathCandidates([
      "../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeTransferEventHandler.java",
      "../../choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeTransferEventHandler.java",
      "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeTransferEventHandler.java",
    ]),
    androidRnBridge: resolvePathCandidates([
      "android/app/main/java/com/choicely/rn/bridge/ChoicelyRNBridge.java",
      "android/app/src/main/java/com/choicely/rn/bridge/ChoicelyRNBridge.java",
    ]),
  };

  const dashboard = readRequired(files.dashboard);
  const bridgeClient = readRequired(files.bridgeClient);
  const bridgeEvent = readRequired(files.bridgeEvent);
  const bridgeKeys = readRequired(files.bridgeKeys);
  const universalBridge = readRequired(files.universalBridge);
  const authHandler = readRequired(files.authHandler);
  const navigationHandler = readRequired(files.navigationHandler);
  const appHandler = readRequired(files.appHandler);
  const transferHandler = readRequired(files.transferHandler);
  const androidRnBridge = readRequired(files.androidRnBridge);

  const failures = [];
  const warnings = [];
  const stats = { passed: 0 };

  const requiredEvents = [
    "choicely:navigation",
    "choicely:auth:getToken",
    "choicely:auth:checkLogin",
    "choicely:auth:getUserInfo",
    "choicely:auth:openLogin",
    "choicely:auth:logout",
    "choicely:app:getContext",
    "choicely:app:getConfig",
    "choicely:app:getHistory",
    "choicely:app:load",
    "choicely:app:store",
    "choicely:app:remove",
    "choicely:app:uploadFile",
    "choicely:app:uploadImage",
    "choicely:app:openCamera",
  ];

  for (const eventName of requiredEvents) {
    assertCondition({
      condition: bridgeEvent.includes(`"${eventName}"`),
      message: `ChoicelyBridgeEvent is missing ${eventName}`,
      file: files.bridgeEvent,
      failures,
      stats,
    });
  }

  assertRegex({
    content: bridgeKeys,
    regex: /EVENT_NAME\s*=\s*"event_name"/,
    message: "ChoicelyBridgeKeys.EVENT_NAME must be event_name",
    file: files.bridgeKeys,
    failures,
    stats,
  });
  assertRegex({
    content: bridgeKeys,
    regex: /ERROR_CODE\s*=\s*"error_code"/,
    message: "ChoicelyBridgeKeys.ERROR_CODE must be error_code",
    file: files.bridgeKeys,
    failures,
    stats,
  });
  assertRegex({
    content: bridgeKeys,
    regex: /INNER_NAVIGATION\s*=\s*"inner_navigation"/,
    message: "ChoicelyBridgeKeys.INNER_NAVIGATION must be inner_navigation",
    file: files.bridgeKeys,
    failures,
    stats,
  });

  assertRegex({
    content: universalBridge,
    regex: /addHandler\(new\s+ChoicelyBridgeNavigationHandler\(\)\)/,
    message: "ChoicelyBridgeNavigationHandler is not registered",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /addHandler\(new\s+ChoicelyBridgeAuthEventHandler\(\)\)/,
    message: "ChoicelyBridgeAuthEventHandler is not registered",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /addHandler\(new\s+ChoicelyBridgeAppEventHandler\(\)\)/,
    message: "ChoicelyBridgeAppEventHandler is not registered",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /addHandler\(new\s+ChoicelyBridgeTransferEventHandler\(\)\)/,
    message: "ChoicelyBridgeTransferEventHandler is not registered",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /dataProviders\.put\(t,\s*dataProvider\)/,
    message: "addEventHandler must register handlers in dataProviders",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /dataProviders\.get\(eventName\)/,
    message: "handleRequest must look up handler by event name",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /ERR_NO_DATA_PROVIDER/,
    message: "handleRequest must return ERR_NO_DATA_PROVIDER for unknown events",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /result\.putString\(ChoicelyBridgeKeys\.EVENT_NAME,\s*ChoicelyBridgeEvent\.ERROR\)/,
    message: "makeErrorResult must tag event name as choicely:error",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /result\.putString\(ChoicelyBridgeKeys\.ERROR_CODE,\s*errorCode\)/,
    message: "makeErrorResult must include error_code",
    file: files.universalBridge,
    failures,
    stats,
  });
  assertRegex({
    content: universalBridge,
    regex: /result\.putString\(ChoicelyBridgeKeys\.MESSAGE,\s*message\)/,
    message: "makeErrorResult must include message",
    file: files.universalBridge,
    failures,
    stats,
  });

  assertRegex({
    content: authHandler,
    regex: /case\s+ChoicelyBridgeEvent\.AUTH_GET_TOKEN:[\s\S]*handleGetToken\(/,
    message: "AUTH_GET_TOKEN is not dispatched to handleGetToken",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /case\s+ChoicelyBridgeEvent\.AUTH_CHECK_LOGIN:[\s\S]*handleCheckLogin\(/,
    message: "AUTH_CHECK_LOGIN is not dispatched to handleCheckLogin",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /case\s+ChoicelyBridgeEvent\.AUTH_OPEN_LOGIN:[\s\S]*handleOpenLogin\(/,
    message: "AUTH_OPEN_LOGIN is not dispatched to handleOpenLogin",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /case\s+ChoicelyBridgeEvent\.AUTH_GET_USER_INFO:[\s\S]*handleGetUserInfo\(/,
    message: "AUTH_GET_USER_INFO is not dispatched to handleGetUserInfo",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /case\s+ChoicelyBridgeEvent\.AUTH_LOGOUT:[\s\S]*ChoicelySDK\.logout\(\)/,
    message: "AUTH_LOGOUT must call ChoicelySDK.logout()",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /putBoolean\("isLoggedIn",\s*isLoggedIn\)/,
    message: "checkLogin response is missing isLoggedIn",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /putBoolean\("isAnonymous",\s*isAnonymous\)/,
    message: "checkLogin response is missing isAnonymous",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /setInternalUrl\("choicely:\/\/studio\/profile"\)/,
    message: "auth:openLogin is not targeting profile navigation URL",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /putBoolean\("success",\s*true\)/,
    message: "auth:openLogin does not return success=true",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /putString\("token",\s*accessToken\)/,
    message: "auth:getToken response is missing token",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /putString\("userKey",\s*userKey\)/,
    message: "auth:getUserInfo response is missing userKey",
    file: files.authHandler,
    failures,
    stats,
  });
  assertRegex({
    content: authHandler,
    regex: /putString\("accessToken",\s*accessToken\)/,
    message: "auth:getUserInfo response is missing accessToken",
    file: files.authHandler,
    failures,
    stats,
  });

  assertRegex({
    content: navigationHandler,
    regex: /ChoicelyBridgeEvent\.NAVIGATION\.equals\(eventName\)/,
    message: "navigation handler must gate on choicely:navigation",
    file: files.navigationHandler,
    failures,
    stats,
  });
  assertRegex({
    content: navigationHandler,
    regex: /payload\s*==\s*null/,
    message: "navigation handler must validate payload presence",
    file: files.navigationHandler,
    failures,
    stats,
  });
  assertRegex({
    content: navigationHandler,
    regex: /ChoicelyBridgeKeys\.INNER_NAVIGATION/,
    message: "navigation handler is not reading inner_navigation",
    file: files.navigationHandler,
    failures,
    stats,
  });
  assertRegex({
    content: navigationHandler,
    regex: /OnChoicelyContentClick\.internalUrl\(innerNavigation\)\s*\.openContent\(\)/,
    message: "navigation handler must open internal URL from inner_navigation",
    file: files.navigationHandler,
    failures,
    stats,
  });
  assertRegex({
    content: navigationHandler,
    regex: /future\.complete\(payload\)/,
    message: "navigation handler should return payload on success",
    file: files.navigationHandler,
    failures,
    stats,
  });

  assertRegex({
    content: appHandler,
    regex: /case\s+ChoicelyBridgeEvent\.APP_GET_CONTEXT:[\s\S]*handleGetContext\(/,
    message: "APP_GET_CONTEXT is not dispatched to handleGetContext",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /case\s+ChoicelyBridgeEvent\.APP_GET_CONFIG:[\s\S]*handleGetConfig\(/,
    message: "APP_GET_CONFIG is not dispatched to handleGetConfig",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /case\s+ChoicelyBridgeEvent\.APP_GET_HISTORY:[\s\S]*handleGetHistory\(/,
    message: "APP_GET_HISTORY is not dispatched to handleGetHistory",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /case\s+ChoicelyBridgeEvent\.APP_LOAD:[\s\S]*handleLoadApp\(/,
    message: "APP_LOAD is not dispatched to handleLoadApp",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /case\s+ChoicelyBridgeEvent\.APP_STORE:[\s\S]*handleStoreApp\(/,
    message: "APP_STORE is not dispatched to handleStoreApp",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /case\s+ChoicelyBridgeEvent\.APP_REMOVE:[\s\S]*handleRemoveApp\(/,
    message: "APP_REMOVE is not dispatched to handleRemoveApp",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /putString\("appKey",\s*null\)/,
    message: "getContext response is missing appKey key",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /putString\("brandId",\s*null\)/,
    message: "getContext response is missing brandId key",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /putString\("title",\s*app\.getTitle\(\)\)/,
    message: "getConfig response is missing title",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /putStringArrayList\("screens",\s*screens\)/,
    message: "getConfig response is missing screens",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /putBundle\("default_nav_item",\s*navMap\)/,
    message: "getConfig response is missing default_nav_item",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /putParcelableArrayList\("apps",\s*appList\)/,
    message: "getHistory response is missing apps",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /private void handleLoadApp[\s\S]*ERR_BAD_REQUEST[\s\S]*appKey is required/,
    message: "app:load must validate appKey",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /private void handleStoreApp[\s\S]*ERR_BAD_REQUEST[\s\S]*appKey is required/,
    message: "app:store must validate appKey",
    file: files.appHandler,
    failures,
    stats,
  });
  assertRegex({
    content: appHandler,
    regex: /private void handleRemoveApp[\s\S]*ERR_BAD_REQUEST[\s\S]*appKey is required/,
    message: "app:remove must validate appKey",
    file: files.appHandler,
    failures,
    stats,
  });

  assertRegex({
    content: transferHandler,
    regex: /ChoicelyBridgeEvent\.APP_UPLOAD_FILE/,
    message: "transfer handler must support APP_UPLOAD_FILE",
    file: files.transferHandler,
    failures,
    stats,
  });
  assertRegex({
    content: transferHandler,
    regex: /ChoicelyBridgeEvent\.APP_UPLOAD_IMAGE/,
    message: "transfer handler must support APP_UPLOAD_IMAGE",
    file: files.transferHandler,
    failures,
    stats,
  });
  assertRegex({
    content: transferHandler,
    regex: /ChoicelyBridgeEvent\.APP_OPEN_CAMERA/,
    message: "transfer handler must support APP_OPEN_CAMERA",
    file: files.transferHandler,
    failures,
    stats,
  });
  assertRegex({
    content: transferHandler,
    regex: /ERR_NOT_READY/,
    message: "transfer handler must return ERR_NOT_READY when delegate is missing",
    file: files.transferHandler,
    failures,
    stats,
  });
  assertRegex({
    content: transferHandler,
    regex: /ERR_TRANSFER/,
    message: "transfer handler must return ERR_TRANSFER on delegate exceptions",
    file: files.transferHandler,
    failures,
    stats,
  });

  assertRegex({
    content: androidRnBridge,
    regex: /addBridge\(ChoicelyBridgePlatform\.REACT_NATIVE,\s*this\)/,
    message: "Android RN bridge is not registered in ChoicelyUniversalBridge",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /setTransferDelegate\(this::handleTransferRequest\)/,
    message: "Android RN bridge must register transfer delegate",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /args\.getString\(ChoicelyBridgeKeys\.EVENT_NAME\)/,
    message: "Android RN bridge request key must be event_name",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /ERR_BAD_REQUEST/,
    message: "Android RN bridge must reject invalid requests with ERR_BAD_REQUEST",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /event_name is required/,
    message: "Android RN bridge must reject when event_name is missing",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /payload\.remove\(ChoicelyBridgeKeys\.EVENT_NAME\)/,
    message: "Android RN bridge must remove event_name from payload before dispatch",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /handleRequest\(ChoicelyBridgePlatform\.REACT_NATIVE,\s*methodId,\s*payload\)/,
    message: "Android RN bridge is not forwarding requests to universal bridge",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /result\.getString\(ChoicelyBridgeKeys\.ERROR_CODE\)/,
    message: "Android RN bridge must inspect error_code in native response",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /promise\.reject\(errorCode,\s*errorMsg,\s*getMapFromBundle\(bundle\)\)/,
    message: "Android RN bridge does not reject JS promise on native errors",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /case\s+ChoicelyBridgeEvent\.APP_OPEN_CAMERA:[\s\S]*launchImageTransfer\(/,
    message: "Android RN bridge transfer dispatch is missing APP_OPEN_CAMERA",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /case\s+ChoicelyBridgeEvent\.APP_UPLOAD_IMAGE:[\s\S]*launchImageTransfer\(/,
    message: "Android RN bridge transfer dispatch is missing APP_UPLOAD_IMAGE",
    file: files.androidRnBridge,
    failures,
    stats,
  });
  assertRegex({
    content: androidRnBridge,
    regex: /case\s+ChoicelyBridgeEvent\.APP_UPLOAD_FILE:[\s\S]*launchFileTransfer\(/,
    message: "Android RN bridge transfer dispatch is missing APP_UPLOAD_FILE",
    file: files.androidRnBridge,
    failures,
    stats,
  });

  assertRegex({
    content: bridgeClient,
    regex: /BRIDGE_REQUEST_EVENT_KEY\s*=\s*"event_name"/,
    message: "RN bridge client request key must be event_name",
    file: files.bridgeClient,
    failures,
    stats,
  });
  assertRegex({
    content: bridgeClient,
    regex: /const\s+args\s*=\s*\{\s*\[BRIDGE_REQUEST_EVENT_KEY\]:\s*eventName\s*\}/,
    message: "RN bridge client is not building {event_name, ...payload} envelope",
    file: files.bridgeClient,
    failures,
    stats,
  });
  assertRegex({
    content: bridgeClient,
    regex: /ChoicelyRNBridge\.request\(\s*args\s*\)/,
    message: "RN bridge client is not forwarding normalized request args",
    file: files.bridgeClient,
    failures,
    stats,
  });

  const checkLoginMatches =
    dashboard.match(/bridge\.request\(\s*"choicely:auth:checkLogin"\s*\)/g) || [];
  assertCondition({
    condition: checkLoginMatches.length >= 2,
    message:
      "Dashboard should request choicely:auth:checkLogin for input tap and send flow",
    file: files.dashboard,
    failures,
    stats,
  });

  const openLoginMatches =
    dashboard.match(/bridge\.request\(\s*"choicely:auth:openLogin"\s*\)/g) || [];
  assertCondition({
    condition: openLoginMatches.length >= 2,
    message:
      "Dashboard should request choicely:auth:openLogin for input tap and send flow",
    file: files.dashboard,
    failures,
    stats,
  });

  const hasAuthOverlayPressable = /<Pressable[\s\S]*onPress=\{handleInputFocus\}/.test(
    dashboard
  );
  const hasWrappedTouchableFocus =
    /<TouchableOpacity[\s\S]*style=\{styles\.inputBoxWrapper\}[\s\S]*onPress=\{handleInputFocus\}/.test(
      dashboard
    );
  assertCondition({
    condition: hasAuthOverlayPressable || hasWrappedTouchableFocus,
    message:
      "Dashboard must route chat-box tap to handleInputFocus (Pressable overlay or TouchableOpacity wrapper)",
    file: files.dashboard,
    failures,
    stats,
  });
  assertRegex({
    content: dashboard,
    regex: /<ChatInput[\s\S]*onSend=\{handleSend\}[\s\S]*disabled=\{!isAuthChecked\}/,
    message: "Dashboard chat input must route send and disabled state through auth checks",
    file: files.dashboard,
    failures,
    stats,
  });
  assertRegex({
    content: dashboard,
    regex: /getStorage\(\)\.set\(\s*PENDING_MESSAGE_KEY,\s*text\s*\)/,
    message: "Dashboard should persist pending message before opening login",
    file: files.dashboard,
    failures,
    stats,
  });
  assertRegex({
    content: dashboard,
    regex: /bridge\.request\(\s*"choicely:navigation"\s*,\s*\{\s*inner_navigation:\s*"choicely:\/\/open_qr"/,
    message: "Dashboard QR CTA should request choicely:navigation with choicely://open_qr",
    file: files.dashboard,
    failures,
    stats,
  });

  const androidArtifacts = findExistingAndroidArtifacts();
  if (androidArtifacts.length === 0) {
    warnings.push(
      "- No built Android APK/AAR found. Build app or SDK to verify compiled host artifacts."
    );
  } else {
    const binaryContent = fs.readFileSync(androidArtifacts[0], "latin1");
    const requiredBinaryTokens = [
      "choicely:navigation",
      "choicely:auth:checkLogin",
      "choicely:auth:openLogin",
      "choicely://open_qr",
      "event_name",
      "error_code",
    ];
    for (const token of requiredBinaryTokens) {
      assertCondition({
        condition: binaryContent.includes(token),
        message: `compiled Android artifact is missing token ${token}`,
        file: androidArtifacts[0],
        failures,
        stats,
      });
    }
    stats.passed += 1;
  }

  if (warnings.length > 0) {
    console.warn(`[host-bridge-verify] WARN: ${warnings.length} warning(s)`);
    for (const warning of warnings) {
      console.warn(warning);
    }
  }

  if (failures.length > 0) {
    console.error(
      `[host-bridge-verify] ERROR: Host bridge behavior checks failed (${failures.length})`
    );
    for (const failure of failures) {
      console.error(failure);
    }
    process.exit(1);
  }

  console.log(
    `[host-bridge-verify] Checks passed: ${stats.passed} (${toDisplayPath(
      androidArtifacts[0] || files.universalBridge
    )})`
  );
  console.log(
    "[host-bridge-verify] OK: RN dashboard, bridge envelope, and Android host handler contracts are aligned."
  );
}

try {
  main();
} catch (error) {
  console.error(`[host-bridge-verify] ERROR: ${error.message}`);
  process.exit(1);
}
