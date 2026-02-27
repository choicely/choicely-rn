#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { spawnSync } = require("child_process");
const TRANSFER_EVENT_TOKENS = ["openCamera", "uploadImage", "uploadFile"];
const TRANSFER_EVENT_SET = new Set(TRANSFER_EVENT_TOKENS);
const TRANSFER_PROBE_PAYLOAD_KEY = "probeToken";
const TRANSFER_PROBE_PAYLOAD_VALUE = "bridge_probe_transfer_v1";
const TRANSFER_PROBE_OUTCOME_PAYLOAD_KEY = "probeOutcome";
const TRANSFER_PROBE_OUTCOME_CANCELLED = "cancelled";
const TRANSFER_PROBE_OUTCOME = {
  success: "success",
  cancel: "cancel",
  live: "live",
};

function printUsage() {
  console.log(`
Usage: node ./tools/verify-runtime-bridge-contract.js [options] [probe passthrough args]

Options:
  --platform <ios|android>    Force probe platform
  --events <csv>              Event tokens to verify
                              (default: checkLogin,getUserInfo,getToken,getContext,getConfig,getHistory,openLogin,qrNav)
  --include-transfer          Append transfer events (openCamera,uploadImage,uploadFile)
  --watch-seconds <n>         Probe watch duration (default: 18)
  --app-key <key>             appKey passed to appLoad token payload
  --request-timeout-ms <n>    Timeout for each bridge request in bridge_probe (default: 12000)
  --transfer-probe-outcome <success|cancel|live>
                              Transfer probe behavior (default: success)
  --strict                    Treat warnings as failures
  --strict-context            Fail if getContext is missing brandId/appKey
  --json-out <path>           Write verification report JSON
  --help                      Show this help

Examples:
  node ./tools/verify-runtime-bridge-contract.js
  node ./tools/verify-runtime-bridge-contract.js --platform android
  node ./tools/verify-runtime-bridge-contract.js --events checkLogin,getUserInfo,getToken
  node ./tools/verify-runtime-bridge-contract.js --include-transfer --watch-seconds 40
  node ./tools/verify-runtime-bridge-contract.js --include-transfer --transfer-probe-outcome cancel --platform ios
  node ./tools/verify-runtime-bridge-contract.js --include-transfer --transfer-probe-outcome live --request-timeout-ms 90000 --platform ios
  node ./tools/verify-runtime-bridge-contract.js --strict --strict-context
  node ./tools/verify-runtime-bridge-contract.js --serial emulator-5554
`);
}

function parseArgs(argv) {
  const options = {
    platform: "",
    events:
      "checkLogin,getUserInfo,getToken,getContext,getConfig,getHistory,openLogin,qrNav",
    includeTransfer: false,
    watchSeconds: 18,
    appKey: "",
    requestTimeoutMs: 12000,
    transferProbeOutcome: TRANSFER_PROBE_OUTCOME.success,
    strict: false,
    strictContext: false,
    jsonOut: "",
    passthroughArgs: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--platform":
        options.platform = String(argv[i + 1] || "").trim().toLowerCase();
        i += 1;
        break;
      case "--events":
        options.events = argv[i + 1] || options.events;
        i += 1;
        break;
      case "--include-transfer":
        options.includeTransfer = true;
        break;
      case "--watch-seconds":
        options.watchSeconds = Number(argv[i + 1] || options.watchSeconds);
        i += 1;
        break;
      case "--app-key":
        options.appKey = argv[i + 1] || options.appKey;
        i += 1;
        break;
      case "--request-timeout-ms":
        options.requestTimeoutMs = Number(
          argv[i + 1] || options.requestTimeoutMs
        );
        i += 1;
        break;
      case "--transfer-probe-outcome":
        options.transferProbeOutcome = String(
          argv[i + 1] || options.transferProbeOutcome
        )
          .trim()
          .toLowerCase();
        i += 1;
        break;
      case "--strict":
        options.strict = true;
        break;
      case "--strict-context":
        options.strictContext = true;
        break;
      case "--json-out":
        options.jsonOut = argv[i + 1] || options.jsonOut;
        i += 1;
        break;
      case "--help":
        printUsage();
        process.exit(0);
        break;
      default:
        options.passthroughArgs.push(arg);
        if (
          i + 1 < argv.length
          && !argv[i + 1].startsWith("--")
        ) {
          options.passthroughArgs.push(argv[i + 1]);
          i += 1;
        }
        break;
    }
  }

  if (!Number.isFinite(options.watchSeconds) || options.watchSeconds < 1) {
    console.error("[bridge-runtime-verify] ERROR: --watch-seconds must be >= 1");
    process.exit(1);
  }

  if (options.platform && options.platform !== "ios" && options.platform !== "android") {
    console.error("[bridge-runtime-verify] ERROR: --platform must be ios or android");
    process.exit(1);
  }
  if (
    !Number.isFinite(options.requestTimeoutMs)
    || options.requestTimeoutMs < 1000
  ) {
    console.error(
      "[bridge-runtime-verify] ERROR: --request-timeout-ms must be >= 1000"
    );
    process.exit(1);
  }
  if (
    options.transferProbeOutcome !== TRANSFER_PROBE_OUTCOME.success
    && options.transferProbeOutcome !== TRANSFER_PROBE_OUTCOME.cancel
    && options.transferProbeOutcome !== TRANSFER_PROBE_OUTCOME.live
  ) {
    console.error(
      "[bridge-runtime-verify] ERROR: --transfer-probe-outcome must be success, cancel, or live"
    );
    process.exit(1);
  }

  return options;
}

// ---------------------------------------------------------------------------
// Passthrough-arg hints (explicit flags on the command line)
// ---------------------------------------------------------------------------

function inferPlatformFromPassthroughArgs(passthroughArgs) {
  const args = new Set(passthroughArgs || []);
  const androidHints = [
    "--serial", "--select-serial", "--list-serials",
    "--app-id", "--activity", "--no-force-stop", "--no-clear-logcat",
  ];
  const iosHints = ["--device", "--bundle-id", "--openurl", "--physical", "--physical-device"];
  if (androidHints.some((f) => args.has(f))) return "android";
  if (iosHints.some((f) => args.has(f))) return "ios";
  return "";
}

// ---------------------------------------------------------------------------
// Device detection helpers (all return [] on any failure — never throw)
// ---------------------------------------------------------------------------

function detectBootedIosSimulators() {
  const result = spawnSync(
    "xcrun", ["simctl", "list", "devices", "booted", "--json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  if (result.status !== 0 || !result.stdout) return [];
  try {
    const parsed = JSON.parse(result.stdout);
    const out = [];
    for (const devices of Object.values(parsed.devices || {})) {
      if (!Array.isArray(devices)) continue;
      for (const d of devices) {
        if (d && d.state === "Booted" && d.udid) {
          out.push({ platform: "ios", kind: "simulator", udid: d.udid, name: d.name || d.udid });
        }
      }
    }
    return out;
  } catch (_) { return []; }
}

function detectIosPhysicalDevices() {
  const tmpFile = path.join(os.tmpdir(), `devicectl-list-${Date.now()}.json`);
  const result = spawnSync(
    "xcrun", ["devicectl", "list", "devices", "--json-output", tmpFile],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  if (result.status !== 0 || !fs.existsSync(tmpFile)) return [];
  try {
    const raw = fs.readFileSync(tmpFile, "utf8");
    try { fs.unlinkSync(tmpFile); } catch (_) {}
    const data = JSON.parse(raw);
    return ((data.result && data.result.devices) || [])
      .filter((d) => d.hardwareProperties && d.hardwareProperties.udid)
      .map((d) => ({
        platform: "ios",
        kind: "physical",
        udid: d.hardwareProperties.udid,
        name: (d.deviceProperties && d.deviceProperties.name) || d.hardwareProperties.udid,
      }));
  } catch (_) { return []; }
}

function resolveAdbPath() {
  const envAdb = (process.env.ADB || "").trim();
  if (envAdb) return envAdb;
  const home = process.env.HOME || "";
  if (home) {
    const candidate = path.join(home, "Library/Android/sdk/platform-tools/adb");
    if (fs.existsSync(candidate)) return candidate;
  }
  return "adb";
}

function detectAndroidDevices() {
  const adbPath = resolveAdbPath();
  const result = spawnSync(adbPath, ["devices", "-l"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 || !result.stdout) return [];
  const out = [];
  for (const line of result.stdout.split("\n").map((l) => l.trim())) {
    if (!line || line.startsWith("List of devices attached")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts[1] !== "device") continue;
    const serial = parts[0];
    const meta = {};
    for (const token of parts.slice(2)) {
      const idx = token.indexOf(":");
      if (idx > 0) meta[token.slice(0, idx)] = token.slice(idx + 1);
    }
    out.push({
      platform: "android",
      kind: serial.startsWith("emulator-") ? "emulator" : "device",
      serial,
      name: meta.model || meta.device || serial,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Device display + interactive selection
// ---------------------------------------------------------------------------

function formatDevice(device) {
  if (device.platform === "ios") {
    return `[iOS]     ${device.name}  (${device.udid})  [${device.kind}]`;
  }
  return `[Android] ${device.serial} — ${device.name}  [${device.kind}]`;
}

function selectDeviceInteractive(devices) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      "[bridge-runtime-verify] ERROR: multiple targets found but no TTY for interactive selection.\n"
      + "  Pass --platform <ios|android> or a device flag to select explicitly."
    );
    process.exit(1);
  }

  return new Promise((resolve) => {
    let selected = 0;
    let rendered = 0;
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("keypress", onKeypress);
      process.stdout.write("\x1b[?25h");
      if (rendered > 0) {
        readline.moveCursor(process.stdout, 0, -rendered);
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);
      }
    };

    const render = () => {
      if (rendered > 0) {
        readline.moveCursor(process.stdout, 0, -rendered);
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);
      }
      const lines = [
        "[bridge-runtime-verify] Select target (↑/↓ to move, Enter to confirm, Esc to cancel):",
        ...devices.map((d, i) => `  ${i === selected ? "▶" : " "} ${formatDevice(d)}`),
      ];
      process.stdout.write(lines.join("\n") + "\n");
      rendered = lines.length;
    };

    function onKeypress(_str, key) {
      if (!key) return;
      if (key.name === "up") {
        selected = (selected - 1 + devices.length) % devices.length;
        render();
      } else if (key.name === "down") {
        selected = (selected + 1) % devices.length;
        render();
      } else if (key.name === "return") {
        cleanup();
        resolve(devices[selected]);
      } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        cleanup();
        process.exit(0);
      }
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write("\x1b[?25l");
    process.stdin.on("keypress", onKeypress);
    render();
  });
}

// ---------------------------------------------------------------------------
// Build probe args from selected device entry
// ---------------------------------------------------------------------------

function buildProbeFromDevice({ device, scripts }) {
  if (device.platform === "ios") {
    const extraArgs = device.kind === "physical"
      ? ["--physical", "--physical-device", device.udid]
      : ["--device", device.udid];
    return { probeScriptPath: scripts.ios, platform: "ios", extraArgs };
  }
  return {
    probeScriptPath: scripts.android,
    platform: "android",
    extraArgs: ["--serial", device.serial],
  };
}

// ---------------------------------------------------------------------------
// Probe resolution: detect all devices, let user pick
// ---------------------------------------------------------------------------

async function resolveProbeAndDevice({ platform, passthroughArgs }) {
  const iosProbe = path.join(__dirname, "run-ios-runtime-bridge-probe.js");
  const androidProbe = path.join(__dirname, "run-android-runtime-bridge-probe.js");
  const scripts = { ios: iosProbe, android: androidProbe };
  const hasScript = { ios: fs.existsSync(iosProbe), android: fs.existsSync(androidProbe) };

  // Explicit --platform flag → honour it, skip device listing
  if (platform) {
    if (!hasScript[platform]) {
      console.error(
        `[bridge-runtime-verify] ERROR: --platform ${platform} requested but probe script is missing (${scripts[platform]})`
      );
      process.exit(1);
    }
    return { probeScriptPath: scripts[platform], platform, extraArgs: [] };
  }

  // Passthrough args contain a device flag → honour it, skip device listing
  const fromArgs = inferPlatformFromPassthroughArgs(passthroughArgs);
  if (fromArgs) {
    if (!hasScript[fromArgs]) {
      console.error(
        `[bridge-runtime-verify] ERROR: inferred ${fromArgs} from passthrough args but probe script is missing`
      );
      process.exit(1);
    }
    return { probeScriptPath: scripts[fromArgs], platform: fromArgs, extraArgs: [] };
  }

  // Detect all available targets across both platforms
  const allDevices = [
    ...(hasScript.ios ? detectBootedIosSimulators() : []),
    ...(hasScript.ios ? detectIosPhysicalDevices() : []),
    ...(hasScript.android ? detectAndroidDevices() : []),
  ];

  if (allDevices.length === 0) {
    console.error(
      "[bridge-runtime-verify] ERROR: no running iOS simulators or connected Android devices found.\n"
      + "  Boot a simulator, connect a device, or pass --platform <ios|android> explicitly."
    );
    process.exit(1);
  }

  if (allDevices.length === 1) {
    const device = allDevices[0];
    console.log(`[bridge-runtime-verify] Auto-selected single target: ${formatDevice(device)}`);
    return buildProbeFromDevice({ device, scripts });
  }

  // Multiple targets: ask the user
  const chosen = await selectDeviceInteractive(allDevices);
  console.log(`[bridge-runtime-verify] Running against: ${formatDevice(chosen)}`);
  return buildProbeFromDevice({ device: chosen, scripts });
}

function withDefaultAndroidSelection({ platform, passthroughArgs }) {
  if (platform !== "android") {
    return passthroughArgs;
  }
  const args = new Set(passthroughArgs || []);
  if (
    args.has("--serial")
    || args.has("--select-serial")
    || args.has("--list-serials")
  ) {
    return passthroughArgs;
  }
  if (process.stdin.isTTY && process.stdout.isTTY) {
    return [...passthroughArgs, "--select-serial"];
  }
  return passthroughArgs;
}

function normalizeEvents(csv) {
  return String(csv || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function appendTransferEvents(events) {
  const next = [...events];
  const transferSet = new Set(TRANSFER_EVENT_TOKENS);
  const withoutTransfers = next.filter((token) => !transferSet.has(token));
  const disruptiveTokens = new Set(["openLogin", "qrNav", "appLoad", "logout"]);
  const insertAt = withoutTransfers.findIndex((token) => disruptiveTokens.has(token));
  const transferTokensToInsert = [...TRANSFER_EVENT_TOKENS];

  if (insertAt === -1) {
    return [...withoutTransfers, ...transferTokensToInsert];
  }

  return [
    ...withoutTransfers.slice(0, insertAt),
    ...transferTokensToInsert,
    ...withoutTransfers.slice(insertAt),
  ];
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasTransferProbePayload(entry) {
  if (!isPlainObject(entry)) {
    return false;
  }
  const payload = entry.payload;
  if (!isPlainObject(payload)) {
    return false;
  }
  if (!hasOwn(payload, TRANSFER_PROBE_PAYLOAD_KEY)) {
    return false;
  }
  const probeValue = payload[TRANSFER_PROBE_PAYLOAD_KEY];
  if (typeof probeValue !== "string" || probeValue.trim().length === 0) {
    return false;
  }
  if (probeValue === TRANSFER_PROBE_PAYLOAD_VALUE) {
    return true;
  }
  // Bridge probe logs may mask token-like values in debug output.
  if (probeValue === "***" || probeValue.includes("...")) {
    return true;
  }
  return false;
}

function hasTransferProbeCancelledOutcome(entry) {
  if (!isPlainObject(entry)) {
    return false;
  }
  const payload = entry.payload;
  if (
    isPlainObject(payload)
    && payload[TRANSFER_PROBE_OUTCOME_PAYLOAD_KEY] === TRANSFER_PROBE_OUTCOME_CANCELLED
  ) {
    return true;
  }
  return entry.status === "error" && entry.error?.code === "ERR_CANCELLED";
}

function runProbe({
  probeScriptPath,
  eventsCsv,
  watchSeconds,
  appKey,
  requestTimeoutMs,
  transferProbeOutcome,
  passthroughArgs,
}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-runtime-verify-"));
  const probeJsonPath = path.join(tempDir, "probe-report.json");

  const probeArgs = [
    probeScriptPath,
    "--events",
    eventsCsv,
    "--watch-seconds",
    String(watchSeconds),
    "--request-timeout-ms",
    String(requestTimeoutMs),
    "--transfer-probe-outcome",
    transferProbeOutcome,
    "--json-out",
    probeJsonPath,
  ];

  if (appKey) {
    probeArgs.push("--app-key", appKey);
  }
  if (passthroughArgs.length > 0) {
    probeArgs.push(...passthroughArgs);
  }

  const passthroughSet = new Set(passthroughArgs || []);
  const useInheritedStdio = passthroughSet.has("--select-serial");
  const result = spawnSync("node", probeArgs, {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    stdio: useInheritedStdio ? "inherit" : ["ignore", "pipe", "pipe"],
  });

  if (!useInheritedStdio) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  if (!fs.existsSync(probeJsonPath)) {
    console.error(
      `[bridge-runtime-verify] ERROR: probe JSON report missing at ${probeJsonPath}`
    );
    process.exit(1);
  }

  const content = fs.readFileSync(probeJsonPath, "utf8");
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error(
      `[bridge-runtime-verify] ERROR: failed to parse probe JSON: ${error.message}`
    );
    process.exit(1);
  }
  return parsed;
}

function assertType({
  response,
  key,
  type,
  eventToken,
  failures,
  allowNull = false,
}) {
  if (!hasOwn(response, key)) {
    failures.push(`${eventToken}: missing key "${key}"`);
    return;
  }
  const value = response[key];
  if (value == null && allowNull) {
    return;
  }
  if (type === "array") {
    if (!Array.isArray(value)) {
      failures.push(`${eventToken}: key "${key}" must be an array`);
    }
    return;
  }
  if (typeof value !== type) {
    failures.push(`${eventToken}: key "${key}" must be ${type}`);
  }
}

function getFirstNonEmptyString(response, keys) {
  for (const key of keys) {
    const value = response[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
}

function verifyTransferResponse({ token, response, failures }) {
  if (!isPlainObject(response) || Object.keys(response).length === 0) {
    failures.push(`${token}: transfer response is empty`);
    return;
  }

  const expectedType = token === "uploadFile" ? "file" : "image";
  const expectedSourceByToken = {
    openCamera: "camera",
    uploadImage: "photos",
    uploadFile: "files",
  };

  if (hasOwn(response, "type") && typeof response.type !== "string") {
    failures.push(`${token}: key "type" must be string when present`);
  } else if (
    typeof response.type === "string"
    && response.type !== expectedType
  ) {
    failures.push(
      `${token}: key "type" must be "${expectedType}" (got "${response.type}")`
    );
  }

  const expectedSource = expectedSourceByToken[token];
  if (hasOwn(response, "source") && typeof response.source !== "string") {
    failures.push(`${token}: key "source" must be string when present`);
  } else if (
    typeof response.source === "string"
    && expectedSource
    && response.source !== expectedSource
  ) {
    failures.push(
      `${token}: key "source" must be "${expectedSource}" (got "${response.source}")`
    );
  }

  const transferReference = getFirstNonEmptyString(response, [
    "key",
    "imageKey",
    "fileKey",
    "url",
    "downloadUrl",
  ]);
  if (!transferReference) {
    failures.push(
      `${token}: missing transfer reference (expected one of key/imageKey/fileKey/url/downloadUrl)`
    );
  }

  if (token === "uploadFile") {
    const fileName = getFirstNonEmptyString(response, ["fileName", "name"]);
    if (!fileName) {
      failures.push(`${token}: missing file name (expected fileName or name)`);
    }
  }
}

function getTaggedProbeEntries(report) {
  const parsedEntries = Array.isArray(report?.parsedEntries)
    ? report.parsedEntries
    : [];
  const tagged = parsedEntries.filter((entry) => {
    const payload = entry?.payload;
    return (
      isPlainObject(payload)
      && typeof payload.probeRunId === "string"
      && payload.probeRunId.trim().length > 0
    );
  });
  return tagged.length > 0 ? tagged : parsedEntries;
}

function buildLatestByKey(report) {
  const fromTagged = getTaggedProbeEntries(report);
  if (fromTagged.length > 0) {
    const latest = {};
    for (const entry of fromTagged) {
      const key = typeof entry?.key === "string" ? entry.key.trim() : "";
      if (!key) {
        continue;
      }
      latest[key] = entry;
    }
    return latest;
  }
  return report.latestByKey && typeof report.latestByKey === "object"
    ? report.latestByKey
    : {};
}

function createEmptyVerification() {
  return {
    failures: [],
    warnings: [],
    passedChecks: 0,
    staleBundleTokens: [],
    transferTimeoutTokens: [],
    missingTransferTokens: [],
    missingTransferProbePayloadTokens: [],
    missingTransferProbeOutcomeTokens: [],
  };
}

function mergeVerification(target, next, label = "") {
  const prefix = label ? `[${label}] ` : "";
  target.failures.push(...next.failures.map((entry) => `${prefix}${entry}`));
  target.warnings.push(...next.warnings.map((entry) => `${prefix}${entry}`));
  target.passedChecks += next.passedChecks;
  target.staleBundleTokens.push(...next.staleBundleTokens);
  target.transferTimeoutTokens.push(...next.transferTimeoutTokens);
  target.missingTransferTokens.push(...next.missingTransferTokens);
  target.missingTransferProbePayloadTokens.push(...next.missingTransferProbePayloadTokens);
  target.missingTransferProbeOutcomeTokens.push(...next.missingTransferProbeOutcomeTokens);
}

function dedupeVerificationArrays(verification) {
  verification.staleBundleTokens = [...new Set(verification.staleBundleTokens)];
  verification.transferTimeoutTokens = [...new Set(verification.transferTimeoutTokens)];
  verification.missingTransferTokens = [...new Set(verification.missingTransferTokens)];
  verification.missingTransferProbePayloadTokens = [
    ...new Set(verification.missingTransferProbePayloadTokens),
  ];
  verification.missingTransferProbeOutcomeTokens = [
    ...new Set(verification.missingTransferProbeOutcomeTokens),
  ];
  return verification;
}

function verifyProbeReport({
  report,
  events,
  strictContext,
  transferProbeOutcome,
}) {
  const failures = [];
  const warnings = [];
  const staleBundleTokens = [];
  const transferTimeoutTokens = [];
  const missingTransferTokens = [];
  const missingTransferProbePayloadTokens = [];
  const missingTransferProbeOutcomeTokens = [];
  let passedChecks = 0;

  const latestByKey = buildLatestByKey(report);
  const usesSyntheticTransferProbe =
    transferProbeOutcome !== TRANSFER_PROBE_OUTCOME.live;

  for (const token of events) {
    const entry = latestByKey[token];
    if (!entry) {
      if (TRANSFER_EVENT_SET.has(token)) {
        if (missingTransferProbePayloadTokens.length > 0) {
          failures.push(
            `${token}: missing probe result (prior transfer step ran without ${TRANSFER_PROBE_PAYLOAD_KEY}; native picker/login UI likely interrupted probe sequence)`
          );
        } else {
          failures.push(`${token}: missing probe result`);
        }
        missingTransferTokens.push(token);
      } else {
        failures.push(`${token}: missing probe result`);
      }
      continue;
    }
    const isTransferToken = TRANSFER_EVENT_SET.has(token);
    const hasProbePayload = isTransferToken
      ? hasTransferProbePayload(entry)
      : false;
    if (isTransferToken && usesSyntheticTransferProbe && !hasProbePayload) {
      missingTransferProbePayloadTokens.push(token);
      failures.push(
        `${token}: bridge_probe request payload missing ${TRANSFER_PROBE_PAYLOAD_KEY}=${TRANSFER_PROBE_PAYLOAD_VALUE} (running stale bridge_probe JS bundle)`
      );
      continue;
    }
    if (
      isTransferToken
      && transferProbeOutcome === TRANSFER_PROBE_OUTCOME.cancel
      && !hasTransferProbeCancelledOutcome(entry)
    ) {
      missingTransferProbeOutcomeTokens.push(token);
      failures.push(
        `${token}: bridge_probe request payload missing ${TRANSFER_PROBE_OUTCOME_PAYLOAD_KEY}=${TRANSFER_PROBE_OUTCOME_CANCELLED} (running stale bridge_probe JS bundle for cancel-mode transfer tests)`
      );
      continue;
    }
    if (isTransferToken && entry.status === "error") {
      const code = entry.error?.code || "-";
      if (code === "ERR_CANCELLED") {
        passedChecks += 1;
        continue;
      }
      if (transferProbeOutcome === TRANSFER_PROBE_OUTCOME.cancel) {
        failures.push(
          `${token}: expected status=error code=ERR_CANCELLED in transfer cancel probe mode`
        );
        continue;
      }
      if (token === "openCamera" && code === "ERR_IMAGE_PICKER") {
        passedChecks += 1;
        continue;
      }
      const message = entry.error?.message || "unknown error";
      if (code === "ERR_UNSUPPORTED_TOKEN") {
        staleBundleTokens.push(token);
        failures.push(
          `${token}: status=error code=${code} message=${message} (loaded bridge_probe bundle does not include this probe token; likely stale app bundle)`
        );
        continue;
      }
      if (code === "ERR_TIMEOUT") {
        transferTimeoutTokens.push(token);
        failures.push(
          `${token}: status=error code=${code} message=${message} (bridge request timed out)`
        );
      } else {
        failures.push(`${token}: status=error code=${code} message=${message}`);
      }
      continue;
    }
    if (entry.status !== "ok") {
      const code = entry.error?.code || "-";
      const message = entry.error?.message || "unknown error";
      failures.push(`${token}: status=${entry.status} code=${code} message=${message}`);
      continue;
    }
    if (
      isTransferToken
      && transferProbeOutcome === TRANSFER_PROBE_OUTCOME.cancel
    ) {
      failures.push(
        `${token}: expected status=error code=ERR_CANCELLED in transfer cancel probe mode (got status=ok)`
      );
      continue;
    }
    passedChecks += 1;

    const response = isPlainObject(entry.response) ? entry.response : {};
    if (
      Object.keys(response).length === 0
      && token !== "getContext"
      && !isTransferToken
    ) {
      warnings.push(`${token}: response object is empty`);
    }
    if (isTransferToken) {
      verifyTransferResponse({ token, response, failures });
      continue;
    }

    switch (token) {
      case "checkLogin":
        assertType({
          response,
          key: "isLoggedIn",
          type: "boolean",
          eventToken: token,
          failures,
        });
        assertType({
          response,
          key: "isAnonymous",
          type: "boolean",
          eventToken: token,
          failures,
        });
        break;
      case "getUserInfo":
        assertType({
          response,
          key: "userKey",
          type: "string",
          eventToken: token,
          failures,
          allowNull: true,
        });
        assertType({
          response,
          key: "accessToken",
          type: "string",
          eventToken: token,
          failures,
          allowNull: true,
        });
        break;
      case "getToken":
        assertType({
          response,
          key: "token",
          type: "string",
          eventToken: token,
          failures,
          allowNull: true,
        });
        break;
      case "getContext": {
        const missing = ["brandId", "appKey"].filter((key) => !hasOwn(response, key));
        if (missing.length > 0) {
          const message = `${token}: missing context keys ${missing.join(", ")}`;
          if (strictContext) {
            failures.push(message);
          } else {
            warnings.push(message);
          }
        }
        break;
      }
      case "getConfig":
        assertType({
          response,
          key: "default_nav_item",
          type: "object",
          eventToken: token,
          failures,
          allowNull: true,
        });
        assertType({
          response,
          key: "screens",
          type: "array",
          eventToken: token,
          failures,
        });
        assertType({
          response,
          key: "title",
          type: "string",
          eventToken: token,
          failures,
          allowNull: true,
        });
        break;
      case "getHistory":
        assertType({
          response,
          key: "apps",
          type: "array",
          eventToken: token,
          failures,
        });
        break;
      case "openLogin":
        assertType({
          response,
          key: "success",
          type: "boolean",
          eventToken: token,
          failures,
        });
        break;
      case "qrNav":
        assertType({
          response,
          key: "inner_navigation",
          type: "string",
          eventToken: token,
          failures,
        });
        break;
      default:
        break;
    }
  }

  return {
    failures,
    warnings,
    passedChecks,
    staleBundleTokens: [...new Set(staleBundleTokens)],
    transferTimeoutTokens: [...new Set(transferTimeoutTokens)],
    missingTransferTokens: [...new Set(missingTransferTokens)],
    missingTransferProbePayloadTokens: [...new Set(missingTransferProbePayloadTokens)],
    missingTransferProbeOutcomeTokens: [...new Set(missingTransferProbeOutcomeTokens)],
  };
}

function removeOptionWithValue(args, optionName) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === optionName) {
      if (i + 1 < args.length && !String(args[i + 1]).startsWith("--")) {
        i += 1;
      }
      continue;
    }
    out.push(arg);
  }
  return out;
}

function pinAndroidSerial(passthroughArgs, serial) {
  if (!serial) {
    return passthroughArgs.filter((arg) => arg !== "--select-serial");
  }
  let next = removeOptionWithValue(passthroughArgs, "--serial");
  next = next.filter((arg) => arg !== "--select-serial");
  next.push("--serial", serial);
  return next;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let events = normalizeEvents(options.events);
  if (options.includeTransfer) {
    events = appendTransferEvents(events);
  }
  if (events.length === 0) {
    console.error("[bridge-runtime-verify] ERROR: no events provided");
    process.exit(1);
  }

  const resolvedProbe = await resolveProbeAndDevice({
    platform: options.platform,
    passthroughArgs: options.passthroughArgs,
  });
  const mergedPassthrough = [...options.passthroughArgs, ...resolvedProbe.extraArgs];
  let passthroughArgs = withDefaultAndroidSelection({
    platform: resolvedProbe.platform,
    passthroughArgs: mergedPassthrough,
  });
  let probeReport = null;
  let verification = null;
  const transferTokens = events.filter((token) => TRANSFER_EVENT_SET.has(token));
  const nonTransferTokens = events.filter((token) => !TRANSFER_EVENT_SET.has(token));
  const useLiveIsolation = options.transferProbeOutcome === TRANSFER_PROBE_OUTCOME.live
    && transferTokens.length > 1;

  if (!useLiveIsolation) {
    probeReport = runProbe({
      probeScriptPath: resolvedProbe.probeScriptPath,
      eventsCsv: events.join(","),
      watchSeconds: options.watchSeconds,
      appKey: options.appKey,
      requestTimeoutMs: options.requestTimeoutMs,
      transferProbeOutcome: options.transferProbeOutcome,
      passthroughArgs,
    });
    verification = verifyProbeReport({
      report: probeReport,
      events,
      strictContext: options.strictContext,
      transferProbeOutcome: options.transferProbeOutcome,
    });
  } else {
    console.log(
      "[bridge-runtime-verify] Live mode: isolating transfer checks by token to avoid picker presentation race conditions."
    );

    const aggregateVerification = createEmptyVerification();
    const probeRuns = [];
    let pinnedAndroidSerial = "";

    const runSingle = (eventsForRun, label) => {
      const report = runProbe({
        probeScriptPath: resolvedProbe.probeScriptPath,
        eventsCsv: eventsForRun.join(","),
        watchSeconds: options.watchSeconds,
        appKey: options.appKey,
        requestTimeoutMs: options.requestTimeoutMs,
        transferProbeOutcome: options.transferProbeOutcome,
        passthroughArgs,
      });
      if (!pinnedAndroidSerial && resolvedProbe.platform === "android") {
        pinnedAndroidSerial = report?.options?.serial || "";
        if (pinnedAndroidSerial) {
          passthroughArgs = pinAndroidSerial(passthroughArgs, pinnedAndroidSerial);
        }
      }
      const singleVerification = verifyProbeReport({
        report,
        events: eventsForRun,
        strictContext: options.strictContext,
        transferProbeOutcome: options.transferProbeOutcome,
      });
      mergeVerification(aggregateVerification, singleVerification, label);
      probeRuns.push({
        label,
        events: eventsForRun,
        verification: singleVerification,
        probe: report,
      });
      console.log(
        `[bridge-runtime-verify] Live step=${label} events=${eventsForRun.length} passedChecks=${singleVerification.passedChecks}`
      );
    };

    if (nonTransferTokens.length > 0) {
      runSingle(nonTransferTokens, "core");
    }
    for (const token of transferTokens) {
      runSingle([token], token);
    }

    verification = dedupeVerificationArrays(aggregateVerification);
    probeReport = {
      platform: probeRuns[0]?.probe?.platform || "unknown",
      mode: "live-isolated",
      runs: probeRuns,
    };
  }

  const platform = probeReport.platform || "unknown";

  console.log(
    `[bridge-runtime-verify] Platform=${platform} events=${events.length} passedChecks=${verification.passedChecks}`
  );

  if (verification.warnings.length > 0) {
    console.log(
      `[bridge-runtime-verify] WARN: ${verification.warnings.length} warning(s):`
    );
    for (const warning of verification.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  if (verification.failures.length > 0) {
    console.error(
      `[bridge-runtime-verify] ERROR: ${verification.failures.length} failure(s):`
    );
    for (const failure of verification.failures) {
      console.error(`  - ${failure}`);
    }
    if (verification.staleBundleTokens.length > 0) {
      console.error(
        `[bridge-runtime-verify] HINT: stale bundle detected for transfer probe tokens: ${verification.staleBundleTokens.join(", ")}`
      );
      if (platform === "ios") {
        console.error(
          "[bridge-runtime-verify] HINT: iOS prefers cached remote bundle/embedded bundle when Metro is not active; rebuild/reinstall or clear cached RN bundle before re-running."
        );
      } else if (platform === "android") {
        console.error(
          "[bridge-runtime-verify] HINT: Android may be loading cached remote bundle from app files; clear app data/reinstall or refresh bundle version before re-running."
        );
      }
    }
    if (verification.transferTimeoutTokens.length > 0) {
      console.error(
        `[bridge-runtime-verify] HINT: transfer probe timed out for: ${verification.transferTimeoutTokens.join(", ")}`
      );
      if (options.transferProbeOutcome === TRANSFER_PROBE_OUTCOME.live) {
        console.error(
          "[bridge-runtime-verify] HINT: live transfer mode waits for real picker interaction; complete/cancel picker promptly or increase --request-timeout-ms."
        );
      } else {
        console.error(
          "[bridge-runtime-verify] HINT: close any foreground camera/file-picker activity and rebuild/reinstall app so native probe-token handling is included."
        );
      }
    }
    if (verification.missingTransferTokens.length > 0) {
      console.error(
        `[bridge-runtime-verify] HINT: transfer probe produced no results for: ${verification.missingTransferTokens.join(", ")}`
      );
      if (options.transferProbeOutcome === TRANSFER_PROBE_OUTCOME.live) {
        console.error(
          "[bridge-runtime-verify] HINT: live transfer mode requires user interaction; keep host app foreground and cancel/complete each picker."
        );
      } else {
        console.error(
          "[bridge-runtime-verify] HINT: app likely switched to native picker/login UI before probe completion, or running build lacks native transfer probe-token support."
        );
      }
    }
    if (verification.missingTransferProbePayloadTokens.length > 0) {
      console.error(
        `[bridge-runtime-verify] HINT: bridge_probe is missing transfer probe payload for: ${verification.missingTransferProbePayloadTokens.join(", ")}`
      );
      console.error(
        "[bridge-runtime-verify] HINT: rebuild/reinstall the host app so updated bridge_probe JS bundle is loaded (transfer requests must include probeToken=bridge_probe_transfer_v1)."
      );
    }
    if (verification.missingTransferProbeOutcomeTokens.length > 0) {
      console.error(
        `[bridge-runtime-verify] HINT: bridge_probe is missing cancel-mode payload for: ${verification.missingTransferProbeOutcomeTokens.join(", ")}`
      );
      console.error(
        "[bridge-runtime-verify] HINT: rebuild/reinstall the host app so updated bridge_probe JS bundle is loaded (cancel-mode tests require probeOutcome=cancelled)."
      );
    }
    process.exit(1);
  }

  if (options.strict && verification.warnings.length > 0) {
    console.error(
      "[bridge-runtime-verify] ERROR: warnings are treated as failures in --strict mode"
    );
    process.exit(1);
  }

  if (options.jsonOut) {
    const report = {
      generatedAt: new Date().toISOString(),
      options: {
        platform: options.platform || null,
        events,
        includeTransfer: options.includeTransfer,
        watchSeconds: options.watchSeconds,
        requestTimeoutMs: options.requestTimeoutMs,
        transferProbeOutcome: options.transferProbeOutcome,
        strict: options.strict,
        strictContext: options.strictContext,
        appKey: options.appKey || null,
        passthroughArgs,
      },
      verification,
      probe: probeReport,
    };
    const outPath = path.resolve(process.cwd(), options.jsonOut);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`[bridge-runtime-verify] Wrote JSON report to ${outPath}`);
  }

  console.log("[bridge-runtime-verify] OK: runtime bridge contracts look valid.");
}

main().catch((err) => {
  console.error("[bridge-runtime-verify] ERROR:", err.message || err);
  process.exit(1);
});
