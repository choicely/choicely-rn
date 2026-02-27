#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function resolvePathCandidates(repoRoot, relativeCandidates) {
  for (const relativePath of relativeCandidates) {
    const candidatePath = path.resolve(repoRoot, relativePath);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  return path.resolve(repoRoot, relativeCandidates[0]);
}

const CONFIG = {
  nativeBridgeEventFile: resolvePathCandidates(REPO_ROOT, [
    "../choicely-studio-app-android/choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeEvent.java",
    "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeEvent.java",
    "choicely_sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyBridgeEvent.java",
  ]),
  nativeUniversalBridgeFile: resolvePathCandidates(REPO_ROOT, [
    "../choicely-studio-app-android/choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyUniversalBridge.java",
    "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyUniversalBridge.java",
    "choicely_sdk/src/main/java/com/choicely/sdk/service/bridge/ChoicelyUniversalBridge.java",
  ]),
  nativeHandlersDir: resolvePathCandidates(REPO_ROOT, [
    "../choicely-studio-app-android/choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler",
    "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler",
    "choicely_sdk/src/main/java/com/choicely/sdk/service/bridge/handler",
  ]),
  iosUniversalBridgeCandidates: [
    path.resolve(
      REPO_ROOT,
      "../ChoicelySDK-iOS/Sources/ChoicelyReactNative/UniversalBridge/ChoicelyUniversalBridge.swift"
    ),
    path.resolve(
      REPO_ROOT,
      "../ChoicelySDK-iOS/Sources/ChoicelyReactNative/UniversalBridge/ChoicelyUniversalBridge+EventType.swift"
    ),
    path.resolve(
      REPO_ROOT,
      "../ChoicelySDK-iOS/Sources/ChoicelyReactNative/ChoicelyUniversalBridge.swift"
    ),
    path.resolve(
      REPO_ROOT,
      "ChoicelySDK-iOS/Sources/ChoicelyReactNative/UniversalBridge/ChoicelyUniversalBridge.swift"
    ),
    path.resolve(
      REPO_ROOT,
      "ChoicelySDK-iOS/Sources/ChoicelyReactNative/UniversalBridge/ChoicelyUniversalBridge+EventType.swift"
    ),
    path.resolve(
      REPO_ROOT,
      "ChoicelySDK-iOS/Sources/ChoicelyReactNative/ChoicelyUniversalBridge.swift"
    ),
  ],
  rnBridgeClientFile: resolvePathCandidates(REPO_ROOT, [
    "choicely-rn/rn/src/bridge/ChoicelyRNBridge.js",
    "app-react-native/rn/src/bridge/ChoicelyRNBridge.js",
  ]),
  rnSourceRoots: [
    path.resolve(REPO_ROOT, "choicely-rn/rn/src"),
    path.resolve(REPO_ROOT, "app-react-native/rn/src"),
  ],
  runtimeBundleCandidates: [
    path.resolve(REPO_ROOT, "choicely-rn/dist/android/index.android.bundle"),
    path.resolve(REPO_ROOT, "choicely-rn/dist/ios/main.jsbundle"),
    path.resolve(REPO_ROOT, "app-react-native/dist/android/index.android.bundle"),
    path.resolve(REPO_ROOT, "app-react-native/dist/ios/main.jsbundle"),
    path.resolve(REPO_ROOT, "app/src/main/assets/index.android.bundle"),
  ],
  iosAuthBridgeCandidates: [
    path.resolve(
      REPO_ROOT,
      "../ChoicelySDK-iOS/Sources/ChoicelyReactNative/UniversalBridge/ChoicelyUniversalBridge+Auth.swift"
    ),
    path.resolve(
      REPO_ROOT,
      "ChoicelySDK-iOS/Sources/ChoicelyReactNative/UniversalBridge/ChoicelyUniversalBridge+Auth.swift"
    ),
  ],
  iosTransferBridgeCandidates: [
    path.resolve(
      REPO_ROOT,
      "../ChoicelySDK-iOS/Sources/ChoicelyReactNative/UniversalBridge/ChoicelyUniversalBridge+Transfer.swift"
    ),
    path.resolve(
      REPO_ROOT,
      "ChoicelySDK-iOS/Sources/ChoicelyReactNative/UniversalBridge/ChoicelyUniversalBridge+Transfer.swift"
    ),
  ],
  iosEngineBridgeCandidates: [
    path.resolve(
      REPO_ROOT,
      "../ChoicelySDK-iOS/ChoicelyReactNativeModule/ios/ChoicelyReactNativeEngine/ChoicelyReactNativeEngine/ChoicelyRNBridge.swift"
    ),
    path.resolve(
      REPO_ROOT,
      "ChoicelySDK-iOS/ChoicelyReactNativeModule/ios/ChoicelyReactNativeEngine/ChoicelyReactNativeEngine/ChoicelyRNBridge.swift"
    ),
  ],
  androidAuthHandlerCandidates: [
    path.resolve(
      REPO_ROOT,
      "../choicely-studio-app-android/choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAuthEventHandler.java"
    ),
    path.resolve(
      REPO_ROOT,
      "choicely-sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAuthEventHandler.java"
    ),
    path.resolve(
      REPO_ROOT,
      "choicely_sdk/src/main/java/com/choicely/sdk/service/bridge/handler/ChoicelyBridgeAuthEventHandler.java"
    ),
  ],
  androidRnBridgeCandidates: [
    path.resolve(
      REPO_ROOT,
      "choicely-rn/android/app/main/java/com/choicely/rn/bridge/ChoicelyRNBridge.java"
    ),
    path.resolve(
      REPO_ROOT,
      "../choicely-studio-app-android/choicely-rn/android/app/main/java/com/choicely/rn/bridge/ChoicelyRNBridge.java"
    ),
  ],
  allowedUnknownRequestEvents: [],
  // RN chat flow now uses react-native-image-picker for transfers.
  // Keep native transfer bridge events available, but do not warn when unused.
  allowedUnusedNativeRequestEvents: [
    "choicely:app:openCamera",
    "choicely:app:uploadFile",
    "choicely:app:uploadImage",
  ],
  // Local iOS dev bridge intentionally implements only choicely_ai critical events.
  allowedUnknownRequestEventsWhenUsingIosBridge: [
    "choicely:app:openCamera",
    "choicely:app:uploadFile",
    "choicely:app:uploadImage",
  ],
};

const FORBIDDEN_DEPRECATED_REQUEST_EVENTS = new Set([
  "app:scanQR",
  "bridge:ping",
  "bridge:echo",
]);

const JS_SOURCE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

function fail(message) {
  console.error(`[bridge-lint] ERROR: ${message}`);
  process.exit(1);
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing file: ${toRepoRelative(filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function toRepoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
}

function firstExistingPath(candidates) {
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

function walkFiles(root, extensions, out = []) {
  if (!fs.existsSync(root)) {
    return out;
  }
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, extensions, out);
    } else if (extensions.includes(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }
  return out;
}

function getRnSourceFiles() {
  return CONFIG.rnSourceRoots.flatMap((root) =>
    walkFiles(root, JS_SOURCE_EXTENSIONS)
  );
}

function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function getMatchLine(content, regex) {
  const match = content.match(regex);
  if (!match || typeof match.index !== "number") {
    return null;
  }
  return getLineNumber(content, match.index);
}

function extractMethodBody(content, methodName) {
  const methodIndex = content.indexOf(`${methodName}(`);
  if (methodIndex < 0) {
    return null;
  }
  const openBraceIndex = content.indexOf("{", methodIndex);
  if (openBraceIndex < 0) {
    return null;
  }
  let depth = 0;
  for (let i = openBraceIndex; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(openBraceIndex + 1, i);
      }
    }
  }
  return null;
}

function stripJavaComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function parseBridgeConstants(fileContent) {
  const valuesByConstant = new Map();
  const constantByValue = new Map();
  const constantRegex =
    /public\s+static\s+final\s+String\s+([A-Z0-9_]+)\s*=\s*"([^"]+)";/g;

  let match = null;
  while ((match = constantRegex.exec(fileContent)) !== null) {
    const constantName = match[1];
    const eventValue = match[2];
    valuesByConstant.set(constantName, eventValue);
    constantByValue.set(eventValue, constantName);
  }

  return { valuesByConstant, constantByValue };
}

function parseUniversalBridgeRegistrations(fileContent) {
  const cleanContent = stripJavaComments(fileContent);
  const directConstants = new Set();
  const handlerClassNames = new Set();

  const directEventRegex =
    /addEventHandler\([^,]+,\s*ChoicelyBridgeEvent\.([A-Z0-9_]+)\s*\)/g;
  let match = null;
  while ((match = directEventRegex.exec(cleanContent)) !== null) {
    directConstants.add(match[1]);
  }

  const addHandlerRegex = /addHandler\(\s*new\s+([A-Za-z0-9_]+)\s*\(/g;
  while ((match = addHandlerRegex.exec(cleanContent)) !== null) {
    handlerClassNames.add(match[1]);
  }

  return { directConstants, handlerClassNames };
}

function parseHandlerHandledConstants(fileContent) {
  const methodBody = extractMethodBody(fileContent, "getHandledEventNames");
  if (!methodBody) {
    return new Set();
  }
  const constants = new Set();
  const cleanBody = stripJavaComments(methodBody);
  const constantRegex = /ChoicelyBridgeEvent\.([A-Z0-9_]+)/g;

  let match = null;
  while ((match = constantRegex.exec(cleanBody)) !== null) {
    constants.add(match[1]);
  }
  return constants;
}

function parseSwiftBridgeEvents(fileContent) {
  const values = new Set();
  const enumCaseRegex = /case\s+[A-Za-z0-9_]+\s*=\s*"([^"]+)"/g;
  const switchCaseRegex = /case\s+"([^"]+)":/g;
  let match = null;
  while ((match = enumCaseRegex.exec(fileContent)) !== null) {
    const eventName = match[1];
    if (eventName.startsWith("choicely:")) {
      values.add(eventName);
    }
  }
  while ((match = switchCaseRegex.exec(fileContent)) !== null) {
    const eventName = match[1];
    if (eventName.startsWith("choicely:")) {
      values.add(eventName);
    }
  }
  return values;
}

function collectNativeRegisteredEventValues() {
  const androidBridgeFilesExist =
    fs.existsSync(CONFIG.nativeBridgeEventFile) &&
    fs.existsSync(CONFIG.nativeUniversalBridgeFile) &&
    fs.existsSync(CONFIG.nativeHandlersDir);

  if (androidBridgeFilesExist) {
    const bridgeConstantsFileContent = readFile(CONFIG.nativeBridgeEventFile);
    const universalBridgeFileContent = readFile(
      CONFIG.nativeUniversalBridgeFile
    );
    const { valuesByConstant } = parseBridgeConstants(
      bridgeConstantsFileContent
    );
    const { directConstants, handlerClassNames } =
      parseUniversalBridgeRegistrations(universalBridgeFileContent);

    const registeredConstants = new Set(directConstants);
    for (const className of handlerClassNames) {
      const handlerFile = path.join(
        CONFIG.nativeHandlersDir,
        `${className}.java`
      );
      const handlerContent = readFile(handlerFile);
      const handledConstants = parseHandlerHandledConstants(handlerContent);
      for (const constantName of handledConstants) {
        registeredConstants.add(constantName);
      }
    }

    const registeredValues = new Set();
    const missingConstants = [];
    for (const constantName of registeredConstants) {
      const eventValue = valuesByConstant.get(constantName);
      if (!eventValue) {
        missingConstants.push(constantName);
        continue;
      }
      registeredValues.add(eventValue);
    }

    if (missingConstants.length > 0) {
      fail(
        `Registered native constants missing in ChoicelyBridgeEvent: ${missingConstants
          .sort()
          .join(", ")}`
      );
    }

    return {
      registeredValues,
      registeredConstants,
      nativeSource: "android",
    };
  }

  const iosBridgeFiles = CONFIG.iosUniversalBridgeCandidates.filter((filePath) =>
    fs.existsSync(filePath)
  );
  if (iosBridgeFiles.length > 0) {
    const registeredValues = new Set();
    for (const iosBridgeFile of iosBridgeFiles) {
      const content = readFile(iosBridgeFile);
      const values = parseSwiftBridgeEvents(content);
      for (const value of values) {
        registeredValues.add(value);
      }
    }
    if (registeredValues.size === 0) {
      fail(
        `No Swift bridge events found in: ${iosBridgeFiles
          .map((filePath) => toRepoRelative(filePath))
          .join(", ")}`
      );
    }
    return {
      registeredValues,
      registeredConstants: new Set(),
      nativeSource: "ios",
    };
  }

  fail(
    "Missing native bridge sources. Expected Android choicely-sdk bridge files or iOS ChoicelyUniversalBridge.swift"
  );
}

function addUsage(usageMap, eventName, filePath, line) {
  if (!usageMap.has(eventName)) {
    usageMap.set(eventName, []);
  }
  usageMap.get(eventName).push({
    file: toRepoRelative(filePath),
    line,
  });
}

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectRnRequestEventUsages(sourceFiles) {
  const usageMap = new Map();
  const requestRegex = /\.request\(\s*(["'`])([^"'`]+)\1/g;

  for (const filePath of sourceFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    let match = null;
    while ((match = requestRegex.exec(content)) !== null) {
      const line = getLineNumber(content, match.index);
      const eventName = match[2];
      addUsage(usageMap, eventName, filePath, line);
    }
  }

  return usageMap;
}

function collectDeprecatedEventLiteralUsages(sourceFiles) {
  const usageMap = new Map();
  for (const filePath of sourceFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const deprecatedEventName of FORBIDDEN_DEPRECATED_REQUEST_EVENTS) {
      const literalRegex = new RegExp(
        `(["'\`])${escapeRegex(deprecatedEventName)}\\1`,
        "g"
      );
      let match = null;
      while ((match = literalRegex.exec(content)) !== null) {
        const line = getLineNumber(content, match.index);
        addUsage(usageMap, deprecatedEventName, filePath, line);
      }
    }
  }
  return usageMap;
}

function collectNonLiteralBridgeRequestUsages(sourceFiles) {
  const usages = [];
  const bridgeRequestRegex = /\bbridge\s*\.\s*request\(\s*/g;
  for (const filePath of sourceFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    let match = null;
    while ((match = bridgeRequestRegex.exec(content)) !== null) {
      const firstArgStart = bridgeRequestRegex.lastIndex;
      const firstArgChar = content[firstArgStart];
      if (
        firstArgChar === '"' ||
        firstArgChar === "'" ||
        firstArgChar === "`"
      ) {
        continue;
      }
      const lineEnd = content.indexOf("\n", match.index);
      const lineContent =
        lineEnd >= 0 ? content.slice(match.index, lineEnd) : content.slice(match.index);
      if (lineContent.includes("// bridge-lint-ignore")) {
        continue;
      }
      usages.push({
        file: toRepoRelative(filePath),
        line: getLineNumber(content, match.index),
      });
    }
  }
  return usages;
}

function collectRuntimeBundleDeprecatedFindings() {
  const findings = [];

  for (const bundlePath of CONFIG.runtimeBundleCandidates) {
    if (!fs.existsSync(bundlePath)) {
      continue;
    }
    const content = fs.readFileSync(bundlePath, "utf8");

    for (const deprecatedEventName of FORBIDDEN_DEPRECATED_REQUEST_EVENTS) {
      const regex = new RegExp(escapeRegex(deprecatedEventName), "g");
      let match = null;
      while ((match = regex.exec(content)) !== null) {
        findings.push({
          file: toRepoRelative(bundlePath),
          line: getLineNumber(content, match.index),
          message: `Runtime bundle still references deprecated event "${deprecatedEventName}"`,
        });
      }
    }

    const deprecatedEnvelopeRegexes = [
      /\.request\(\s*\{\s*type\s*:/g,
      /\brequest\s*\(\s*type\s*,\s*payload\s*\)/g,
      /\brequest:\s*function\s*\(\s*type\s*,\s*payload\s*\)/g,
    ];
    for (const regex of deprecatedEnvelopeRegexes) {
      let match = null;
      while ((match = regex.exec(content)) !== null) {
        findings.push({
          file: toRepoRelative(bundlePath),
          line: getLineNumber(content, match.index),
          message:
            "Runtime bundle appears to use deprecated bridge request envelope (type/payload)",
        });
      }
    }
  }

  return findings;
}

function validateBridgeClientContract() {
  const content = readFile(CONFIG.rnBridgeClientFile);
  const file = toRepoRelative(CONFIG.rnBridgeClientFile);
  const errors = [];

  if (!content.includes("BRIDGE_REQUEST_EVENT_KEY")) {
    errors.push({
      file,
      line: 1,
      message:
        "Bridge client is missing BRIDGE_REQUEST_EVENT_KEY and may not be enforcing event_name requests.",
    });
  }

  if (!content.includes("event_name")) {
    errors.push({
      file,
      line: 1,
      message:
        'Bridge client is missing the "event_name" key and may send invalid request envelopes.',
    });
  }

  const deprecatedRequestArgLine = getMatchLine(
    content,
    /\bconst\s+request\s*=\s*\(\s*type\s*,\s*payload\s*\)/
  );
  if (deprecatedRequestArgLine != null) {
    errors.push({
      file,
      line: deprecatedRequestArgLine,
      message:
        "Bridge client request signature is deprecated (type, payload). Use (eventName, payload).",
    });
  }

  const deprecatedEnvelopeLine = getMatchLine(
    content,
    /ChoicelyRNBridge\.request\(\s*\{\s*type\s*,\s*payload\s*\}\s*\)/
  );
  if (deprecatedEnvelopeLine != null) {
    errors.push({
      file,
      line: deprecatedEnvelopeLine,
      message:
        "Bridge client sends deprecated {type, payload} envelope. Must send {event_name, ...payload}.",
    });
  }

  return errors;
}

function pushPatternErrorIfMissing({
  filePath,
  pattern,
  message,
  errors,
}) {
  const content = fs.readFileSync(filePath, "utf8");
  if (!pattern.test(content)) {
    errors.push({
      file: toRepoRelative(filePath),
      line: 1,
      message,
    });
  }
}

function validateNativeContractSemantics() {
  const errors = [];
  const warnings = [];

  const iosAuthBridgeFile = firstExistingPath(CONFIG.iosAuthBridgeCandidates);
  if (iosAuthBridgeFile) {
    pushPatternErrorIfMissing({
      filePath: iosAuthBridgeFile,
      pattern: /"isLoggedIn"/,
      message:
        'iOS auth bridge is missing "isLoggedIn" in checkLogin response.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: iosAuthBridgeFile,
      pattern: /"isAnonymous"/,
      message:
        'iOS auth bridge is missing "isAnonymous" in checkLogin response.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: iosAuthBridgeFile,
      pattern: /"userKey"/,
      message:
        'iOS auth bridge is missing "userKey" in getUserInfo response.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: iosAuthBridgeFile,
      pattern: /"accessToken"/,
      message:
        'iOS auth bridge is missing "accessToken" in getUserInfo response.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: iosAuthBridgeFile,
      pattern: /(choicely:\/\/studio\/profile|InternalUrlType\.profile)/,
      message:
        "iOS auth:openLogin is missing profile navigation target (choicely://studio/profile).",
      errors,
    });
  } else {
    warnings.push(
      "Skipping iOS auth semantic checks (Auth bridge source not found)."
    );
  }

  const iosTransferBridgeFile = firstExistingPath(CONFIG.iosTransferBridgeCandidates);
  if (iosTransferBridgeFile) {
    pushPatternErrorIfMissing({
      filePath: iosTransferBridgeFile,
      pattern: /"type"/,
      message: 'iOS transfer bridge is missing "type" in response payload.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: iosTransferBridgeFile,
      pattern: /"source"/,
      message: 'iOS transfer bridge is missing "source" in response payload.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: iosTransferBridgeFile,
      pattern: /("imageKey"|"fileKey")/,
      message:
        'iOS transfer bridge is missing "imageKey" / "fileKey" payload fields.',
      errors,
    });
  } else {
    warnings.push(
      "Skipping iOS transfer semantic checks (Transfer bridge source not found)."
    );
  }

  const iosEngineBridgeFile = firstExistingPath(CONFIG.iosEngineBridgeCandidates);
  if (iosEngineBridgeFile) {
    pushPatternErrorIfMissing({
      filePath: iosEngineBridgeFile,
      pattern: /error_code/,
      message:
        'iOS RN engine bridge does not appear to inspect "error_code" responses.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: iosEngineBridgeFile,
      pattern: /\breject\(/,
      message:
        "iOS RN engine bridge does not appear to reject promise on native errors.",
      errors,
    });
  } else {
    warnings.push(
      "Skipping iOS RN engine error-propagation checks (engine bridge source not found)."
    );
  }

  const androidAuthHandlerFile = firstExistingPath(
    CONFIG.androidAuthHandlerCandidates
  );
  if (androidAuthHandlerFile) {
    pushPatternErrorIfMissing({
      filePath: androidAuthHandlerFile,
      pattern: /putBoolean\("isLoggedIn"/,
      message:
        'Android auth bridge is missing "isLoggedIn" in checkLogin response.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: androidAuthHandlerFile,
      pattern: /putBoolean\("isAnonymous"/,
      message:
        'Android auth bridge is missing "isAnonymous" in checkLogin response.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: androidAuthHandlerFile,
      pattern: /putString\("userKey"/,
      message:
        'Android auth bridge is missing "userKey" in getUserInfo response.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: androidAuthHandlerFile,
      pattern: /putString\("accessToken"/,
      message:
        'Android auth bridge is missing "accessToken" in getUserInfo response.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: androidAuthHandlerFile,
      pattern: /setInternalUrl\("choicely:\/\/studio\/profile"\)/,
      message:
        "Android auth:openLogin is missing profile navigation target (choicely://studio/profile).",
      errors,
    });
  } else {
    warnings.push(
      "Skipping Android auth semantic checks (Auth handler source not found)."
    );
  }

  const androidRnBridgeFile = firstExistingPath(CONFIG.androidRnBridgeCandidates);
  if (androidRnBridgeFile) {
    pushPatternErrorIfMissing({
      filePath: androidRnBridgeFile,
      pattern: /\bisErrorResult\s*\(/,
      message:
        "Android RN bridge does not appear to detect native error payloads.",
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: androidRnBridgeFile,
      pattern: /ChoicelyBridgeKeys\.ERROR_CODE/,
      message:
        'Android RN bridge does not appear to use "error_code" for rejection.',
      errors,
    });
    pushPatternErrorIfMissing({
      filePath: androidRnBridgeFile,
      pattern: /\brejectPromise\s*\(/,
      message:
        "Android RN bridge does not appear to reject promise on native errors.",
      errors,
    });
  } else {
    warnings.push(
      "Skipping Android RN bridge error-propagation checks (bridge source not found)."
    );
  }

  return { errors, warnings };
}

function main() {
  const bridgeClientContractErrors = validateBridgeClientContract();
  if (bridgeClientContractErrors.length > 0) {
    console.error(
      `[bridge-lint] ERROR: Bridge client request envelope is invalid (${bridgeClientContractErrors.length}):`
    );
    for (const error of bridgeClientContractErrors) {
      console.error(`  - ${error.file}:${error.line} ${error.message}`);
    }
    process.exit(1);
  }

  const runtimeBundleDeprecatedFindings = collectRuntimeBundleDeprecatedFindings();
  if (runtimeBundleDeprecatedFindings.length > 0) {
    console.error(
      `[bridge-lint] ERROR: Runtime bundle compatibility check failed (${runtimeBundleDeprecatedFindings.length}):`
    );
    for (const finding of runtimeBundleDeprecatedFindings) {
      console.error(`  - ${finding.file}:${finding.line} ${finding.message}`);
    }
    process.exit(1);
  }

  const { registeredValues: nativeEventValues, nativeSource } =
    collectNativeRegisteredEventValues();
  const nativeContractSemantics = validateNativeContractSemantics();
  if (nativeContractSemantics.warnings.length > 0) {
    for (const warning of nativeContractSemantics.warnings) {
      console.warn(`[bridge-lint] WARN: ${warning}`);
    }
  }
  if (nativeContractSemantics.errors.length > 0) {
    console.error(
      `[bridge-lint] ERROR: Native bridge semantic contract checks failed (${nativeContractSemantics.errors.length}):`
    );
    for (const error of nativeContractSemantics.errors) {
      console.error(`  - ${error.file}:${error.line} ${error.message}`);
    }
    process.exit(1);
  }

  const sourceFiles = getRnSourceFiles();
  const jsUsageMap = collectRnRequestEventUsages(sourceFiles);
  const deprecatedLiteralUsages = collectDeprecatedEventLiteralUsages(sourceFiles);
  const nonLiteralBridgeRequestUsages =
    collectNonLiteralBridgeRequestUsages(sourceFiles);
  const jsEventValues = new Set(jsUsageMap.keys());
  const allowedUnknown = new Set(CONFIG.allowedUnknownRequestEvents);
  if (nativeSource === "ios") {
    for (const eventName of CONFIG.allowedUnknownRequestEventsWhenUsingIosBridge) {
      allowedUnknown.add(eventName);
    }
  }

  const forbiddenDeprecatedEvents = [...jsEventValues]
    .filter((eventName) => FORBIDDEN_DEPRECATED_REQUEST_EVENTS.has(eventName))
    .sort();

  const invalidNamespaceEvents = [...jsEventValues]
    .filter((eventName) => !eventName.startsWith("choicely:"))
    .sort();

  const unknownJsEvents = [...jsEventValues]
    .filter(
      (eventName) =>
        !nativeEventValues.has(eventName) && !allowedUnknown.has(eventName)
    )
    .sort();

  const unusedNativeEvents = [...nativeEventValues]
    .filter(
      (eventName) =>
        !jsEventValues.has(eventName)
        && !CONFIG.allowedUnusedNativeRequestEvents.includes(eventName)
    )
    .sort();

  console.log(
    `[bridge-lint] Native registered request events: ${nativeEventValues.size}`
  );
  console.log(`[bridge-lint] RN request events used: ${jsEventValues.size}`);
  console.log(
    "[bridge-lint] Note: this validates repository source files and local bundle artifacts when present; it cannot inspect remotely downloaded runtime bundles."
  );

  if (unusedNativeEvents.length > 0) {
    console.warn(
      `[bridge-lint] WARN: Native request events not currently used in RN (${unusedNativeEvents.length}):`
    );
    for (const eventName of unusedNativeEvents) {
      console.warn(`  - ${eventName}`);
    }
  }

  if (unknownJsEvents.length > 0) {
    console.error(
      `[bridge-lint] ERROR: RN is requesting events that are not registered natively (${unknownJsEvents.length}):`
    );
    for (const eventName of unknownJsEvents) {
      const usages = jsUsageMap.get(eventName) || [];
      for (const usage of usages) {
        console.error(`  - ${eventName} at ${usage.file}:${usage.line}`);
      }
    }
    process.exit(1);
  }

  if (forbiddenDeprecatedEvents.length > 0) {
    console.error(
      `[bridge-lint] ERROR: Deprecated request events are forbidden (${forbiddenDeprecatedEvents.length}):`
    );
    for (const eventName of forbiddenDeprecatedEvents) {
      const usages = jsUsageMap.get(eventName) || [];
      for (const usage of usages) {
        console.error(`  - ${eventName} at ${usage.file}:${usage.line}`);
      }
    }
    process.exit(1);
  }

  if (deprecatedLiteralUsages.size > 0) {
    const deprecatedEventNames = [...deprecatedLiteralUsages.keys()].sort();
    console.error(
      `[bridge-lint] ERROR: Deprecated bridge event literals are forbidden in RN source (${deprecatedEventNames.length}):`
    );
    for (const eventName of deprecatedEventNames) {
      const usages = deprecatedLiteralUsages.get(eventName) || [];
      for (const usage of usages) {
        console.error(`  - ${eventName} at ${usage.file}:${usage.line}`);
      }
    }
    process.exit(1);
  }

  if (nonLiteralBridgeRequestUsages.length > 0) {
    console.error(
      `[bridge-lint] ERROR: Non-literal bridge.request(...) calls are not allowed (${nonLiteralBridgeRequestUsages.length}). Use a string literal or add // bridge-lint-ignore with a justification comment:`
    );
    for (const usage of nonLiteralBridgeRequestUsages) {
      console.error(`  - at ${usage.file}:${usage.line}`);
    }
    process.exit(1);
  }

  if (invalidNamespaceEvents.length > 0) {
    console.error(
      `[bridge-lint] ERROR: Bridge request events must use "choicely:" namespace (${invalidNamespaceEvents.length}):`
    );
    for (const eventName of invalidNamespaceEvents) {
      const usages = jsUsageMap.get(eventName) || [];
      for (const usage of usages) {
        console.error(`  - ${eventName} at ${usage.file}:${usage.line}`);
      }
    }
    process.exit(1);
  }

  console.log(
    "[bridge-lint] OK: RN and native bridge request events are aligned."
  );
  console.log("[bridge-lint] OK: Native bridge semantic contracts look valid.");
}

main();
