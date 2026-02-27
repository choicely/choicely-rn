#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

function printUsage() {
  console.log(`
Usage: node ./tools/run-ios-runtime-bridge-probe.js [options]

Options:
  --events <csv>              Probe tokens (default: checkLogin,getUserInfo,getToken)
  --interactive               Add openLogin and qrNav to probe events
  --inner-navigation <url>    inner_navigation for qrNav (default: choicely://open_qr)
  --app-key <key>             appKey passed to appLoad token payload
  --request-timeout-ms <n>    Timeout per bridge request inside bridge_probe (default: 12000)
  --transfer-probe-outcome <success|cancel|live>
                              Transfer probe behavior (default: success)
  --bundle-id <id>            iOS app bundle id (default: com.choicely.studio)
  --device <udid|booted>      Simulator UDID (default: booted; auto-falls back to physical device when none booted)
  --physical                  Target a physical device instead of a simulator (uses xcrun devicectl)
  --physical-device <udid>    Physical device UDID; auto-selects first paired device when omitted
  --watch-seconds <n>         Log watch duration (default: 12)
  --settle-ms <n>             Extra wait after all requested keys are seen (default: 900)
  --json-out <path>           Write parsed probe report JSON
  --openurl                   Use simctl openurl flow (simulator only; may require prompt)
  --no-terminate-existing     Do not force-kill existing app process before launch
  --help                      Show this help

Supported tokens:
  checkLogin, getUserInfo, getToken, openLogin, qrNav,
  getContext, getConfig, getHistory, appLoad, logout,
  openCamera, uploadImage, uploadFile
`);
}

function parseArgs(argv) {
  const options = {
    events: "checkLogin,getUserInfo,getToken",
    interactive: false,
    innerNavigation: "choicely://open_qr",
    appKey: "",
    requestTimeoutMs: 12000,
    transferProbeOutcome: "success",
    bundleId: "com.choicely.studio",
    bundleIdExplicit: false,
    device: process.env.IOS_SIMULATOR_UDID || "booted",
    physical: false,
    physicalDevice: process.env.IOS_DEVICE_UDID || "",
    watchSeconds: 12,
    settleMs: 900,
    jsonOut: "",
    useOpenUrl: false,
    terminateExisting: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--events":
        options.events = argv[i + 1] || options.events;
        i += 1;
        break;
      case "--interactive":
        options.interactive = true;
        break;
      case "--inner-navigation":
        options.innerNavigation = argv[i + 1] || options.innerNavigation;
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
        ).trim().toLowerCase();
        i += 1;
        break;
      case "--bundle-id":
        options.bundleId = argv[i + 1] || options.bundleId;
        options.bundleIdExplicit = true;
        i += 1;
        break;
      case "--device":
        options.device = argv[i + 1] || options.device;
        i += 1;
        break;
      case "--physical":
        options.physical = true;
        break;
      case "--physical-device":
        options.physicalDevice = argv[i + 1] || options.physicalDevice;
        options.physical = true;
        i += 1;
        break;
      case "--watch-seconds":
        options.watchSeconds = Number(argv[i + 1] || options.watchSeconds);
        i += 1;
        break;
      case "--settle-ms":
        options.settleMs = Number(argv[i + 1] || options.settleMs);
        i += 1;
        break;
      case "--json-out":
        options.jsonOut = argv[i + 1] || options.jsonOut;
        i += 1;
        break;
      case "--openurl":
        options.useOpenUrl = true;
        break;
      case "--no-terminate-existing":
        options.terminateExisting = false;
        break;
      case "--help":
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`[probe-runtime] Unknown option: ${arg}`);
        printUsage();
        process.exit(1);
        break;
    }
  }

  if (!Number.isFinite(options.watchSeconds) || options.watchSeconds < 1) {
    console.error("[probe-runtime] --watch-seconds must be >= 1");
    process.exit(1);
  }
  if (!Number.isFinite(options.settleMs) || options.settleMs < 0) {
    console.error("[probe-runtime] --settle-ms must be >= 0");
    process.exit(1);
  }
  if (
    !Number.isFinite(options.requestTimeoutMs)
    || options.requestTimeoutMs < 1000
  ) {
    console.error("[probe-runtime] --request-timeout-ms must be >= 1000");
    process.exit(1);
  }

  if (
    options.transferProbeOutcome !== "success"
    && options.transferProbeOutcome !== "cancel"
    && options.transferProbeOutcome !== "live"
  ) {
    console.error(
      "[probe-runtime] --transfer-probe-outcome must be success, cancel, or live"
    );
    process.exit(1);
  }

  return options;
}

function parseProbePayloadFromLine(line) {
  const marker = "[BRIDGE_PROBE]";
  const markerIndex = line.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }
  const jsonStart = line.indexOf("{", markerIndex);
  const jsonEnd = line.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    return null;
  }
  const candidate = line.slice(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    try {
      const normalized = candidate.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      return JSON.parse(normalized);
    } catch (nestedError) {
      return null;
    }
  }
}

function runXcrunSync(args, label) {
  const result = runXcrunResult(args);
  if (result.status !== 0) {
    console.error(`[probe-runtime] ERROR: ${label} failed`);
    if (result.stdout) {
      process.stderr.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(1);
  }
  return result.stdout || "";
}

function sleepSync(ms) {
  const waitUntil = Date.now() + ms;
  while (Date.now() < waitUntil) {
    // intentional busy-wait for short retry backoff in CLI flow
  }
}

function runXcrunResult(args) {
  const isDeviceCtl = Array.isArray(args) && args[0] === "devicectl";
  const maxAttempts = isDeviceCtl ? 3 : 1;
  let lastResult = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = spawnSync("xcrun", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    lastResult = result;

    if (result.status === 0) {
      return result;
    }

    const stderr = String(result.stderr || "");
    const isCoreDeviceInitTimeout =
      stderr.includes("Timed out waiting for CoreDeviceService")
      || stderr.includes("com.apple.coredevice.devicectl error 1");
    if (!isCoreDeviceInitTimeout || attempt >= maxAttempts - 1) {
      break;
    }
    sleepSync(1200);
  }

  return lastResult;
}

function getBootedSimulatorDevices({ strict = false } = {}) {
  const result = runXcrunResult([
    "simctl",
    "list",
    "devices",
    "booted",
    "--json",
  ]);
  if (result.status !== 0) {
    if (strict) {
      console.error("[probe-runtime] ERROR: simctl list devices booted failed");
      if (result.stdout) {
        process.stderr.write(result.stdout);
      }
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
      process.exit(1);
    }
    return [];
  }
  const output = result.stdout || "";
  let parsed = null;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    if (strict) {
      console.error("[probe-runtime] ERROR: failed to parse simctl devices JSON");
      process.exit(1);
    }
    return [];
  }

  const devicesByRuntime = parsed.devices || {};
  const devices = [];
  for (const runtimeDevices of Object.values(devicesByRuntime)) {
    if (!Array.isArray(runtimeDevices)) {
      continue;
    }
    for (const device of runtimeDevices) {
      if (device && device.state === "Booted" && device.udid) {
        devices.push(device);
      }
    }
  }
  return devices;
}

function ensureAppInstalled(udid, bundleId) {
  const result = runXcrunResult([
    "simctl",
    "get_app_container",
    udid,
    bundleId,
    "app",
  ]);
  if (result.status === 0) {
    return;
  }
  console.error(
    `[probe-runtime] ERROR: app ${bundleId} is not installed on simulator ${udid}`
  );
  if (result.stdout) {
    process.stderr.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  console.error(
    "[probe-runtime] Install with xcodebuild first, then re-run probe."
  );
  process.exit(1);
}

function buildDeepLink(options) {
  const params = new URLSearchParams();
  params.set("events", options.events);
  params.set("autoRun", "1");
  params.set("runId", `${Date.now()}`);
  if (options.interactive) {
    params.set("includeInteractive", "1");
  }
  params.set("innerNavigation", options.innerNavigation);
  if (options.appKey) {
    params.set("appKey", options.appKey);
  }
  params.set("requestTimeoutMs", String(options.requestTimeoutMs));
  params.set("transferProbeOutcome", options.transferProbeOutcome);
  return `choicely://special/rn/bridge_probe?${params.toString()}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeEventTokens(csv) {
  return String(csv || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function watchSimulatorLogs({
  udid,
  watchSeconds,
  expectedKeys,
  settleMs,
}) {
  const args = [
    "simctl",
    "spawn",
    udid,
    "log",
    "stream",
    "--style",
    "compact",
    "--level",
    "debug",
    "--predicate",
    'eventMessage CONTAINS "[BRIDGE_PROBE]"',
  ];

  return new Promise((resolve) => {
    const lines = [];
    const seenKeys = new Set();
    const proc = spawn("xcrun", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let timer = null;
    let settleTimer = null;
    let stopping = false;
    let endedEarly = false;

    const hasAllExpectedKeys = () => {
      if (!expectedKeys || expectedKeys.size === 0) {
        return false;
      }
      for (const key of expectedKeys) {
        if (!seenKeys.has(key)) {
          return false;
        }
      }
      return true;
    };

    const stopLogStream = () => {
      if (stopping) {
        return;
      }
      stopping = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
      proc.kill("SIGINT");
      setTimeout(() => {
        proc.kill("SIGKILL");
      }, 1500);
    };

    const maybeStopEarly = () => {
      if (!hasAllExpectedKeys()) {
        return;
      }
      if (settleTimer) {
        return;
      }
      settleTimer = setTimeout(() => {
        endedEarly = true;
        stopLogStream();
      }, settleMs);
    };

    const collect = (chunk) => {
      const text = String(chunk || "");
      if (!text) {
        return;
      }
      const split = text.split("\n").filter(Boolean);
      for (const line of split) {
        lines.push(line);
        const payload = parseProbePayloadFromLine(line);
        if (!payload) {
          continue;
        }
        const key = payload.key || payload.eventName || "unknown";
        seenKeys.add(key);
        maybeStopEarly();
      }
    };

    proc.stdout.on("data", collect);
    proc.stderr.on("data", collect);

    timer = setTimeout(() => {
      stopLogStream();
    }, watchSeconds * 1000);

    proc.on("close", () => {
      if (timer) {
        clearTimeout(timer);
      }
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
      resolve({
        lines,
        endedEarly,
        seenKeys: Array.from(seenKeys),
      });
    });
  });
}

function fallbackProbeLinesFromLogShow(udid, watchSeconds) {
  const seconds = Math.max(5, Math.ceil(watchSeconds + 6));
  const output = runXcrunSync(
    [
      "simctl",
      "spawn",
      udid,
      "log",
      "show",
      "--style",
      "compact",
      "--last",
      `${seconds}s`,
      "--predicate",
      'eventMessage CONTAINS "[BRIDGE_PROBE]"',
    ],
    "simctl spawn log show"
  );
  return output.split("\n").filter(Boolean);
}

// ---------------------------------------------------------------------------
// Physical device support (xcrun devicectl — Xcode 15+)
// ---------------------------------------------------------------------------

function listPhysicalDevices() {
  const tmpFile = path.join(os.tmpdir(), `devicectl-${Date.now()}.json`);
  const result = runXcrunResult([
    "devicectl",
    "list",
    "devices",
    "--json-output",
    tmpFile,
  ]);
  if (result.status !== 0) {
    return [];
  }
  if (!fs.existsSync(tmpFile)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(tmpFile, "utf8");
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
    const data = JSON.parse(raw);
    return (data.result && data.result.devices) || [];
  } catch (error) {
    return [];
  }
}

function getAvailablePhysicalDevices() {
  return listPhysicalDevices()
    .filter((d) => d && d.hardwareProperties && d.hardwareProperties.udid)
    .map((d) => ({
      udid: d.hardwareProperties.udid,
      name:
        (d.deviceProperties && d.deviceProperties.name)
        || d.hardwareProperties.udid,
    }));
}

function normalizeBundleIdentifier(value) {
  if (typeof value !== "string") {
    return "";
  }
  let next = value.trim();
  if (!next || !next.includes(".")) {
    return "";
  }
  if (/^[A-Z0-9]{6,}\./.test(next) && next.split(".").length > 2) {
    next = next.split(".").slice(1).join(".");
  }
  if (!/^[A-Za-z0-9.-]+$/.test(next)) {
    return "";
  }
  return next;
}

function collectInstalledAppEntries(raw) {
  const byBundleId = new Map();
  const visited = new Set();

  const pushEntry = (bundleIdCandidate, nameCandidate) => {
    const bundleId = normalizeBundleIdentifier(bundleIdCandidate);
    if (!bundleId) {
      return;
    }
    const name = typeof nameCandidate === "string" ? nameCandidate.trim() : "";
    const existing = byBundleId.get(bundleId);
    if (!existing) {
      byBundleId.set(bundleId, { bundleId, name });
      return;
    }
    if (!existing.name && name) {
      existing.name = name;
    }
  };

  const visit = (node, depth) => {
    if (depth > 10 || !node || (typeof node !== "object")) {
      return;
    }
    if (visited.has(node)) {
      return;
    }
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item, depth + 1);
      }
      return;
    }

    const appInformation = node.appInformation
      && typeof node.appInformation === "object"
      ? node.appInformation
      : null;

    const bundleCandidates = [
      node.bundleIdentifier,
      node.bundleID,
      node.applicationBundleIdentifier,
      node.applicationIdentifier,
      appInformation && appInformation.bundleIdentifier,
      appInformation && appInformation.bundleID,
      appInformation && appInformation.applicationBundleIdentifier,
      appInformation && appInformation.applicationIdentifier,
    ];
    const nameCandidates = [
      node.name,
      node.displayName,
      node.localizedName,
      node.appName,
      appInformation && appInformation.displayName,
      appInformation && appInformation.localizedName,
      appInformation && appInformation.name,
      appInformation && appInformation.bundleName,
    ];
    const bundleIdCandidate = bundleCandidates.find((value) => normalizeBundleIdentifier(value));
    const nameCandidate = nameCandidates.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );
    pushEntry(bundleIdCandidate, nameCandidate);

    for (const child of Object.values(node)) {
      visit(child, depth + 1);
    }
  };

  visit(raw, 0);
  return Array.from(byBundleId.values());
}

function queryPhysicalDeviceApps(udid) {
  const tmpFile = path.join(
    os.tmpdir(),
    `devicectl-apps-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  const result = runXcrunResult([
    "devicectl",
    "device",
    "info",
    "apps",
    "--device",
    udid,
    "--json-output",
    tmpFile,
  ]);
  if (result.status !== 0) {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
    return {
      ok: false,
      error: result.stderr || "unknown error",
      apps: [],
      bundleIds: new Set(),
    };
  }
  try {
    if (!fs.existsSync(tmpFile)) {
      return {
        ok: false,
        error: "missing devicectl JSON output",
        apps: [],
        bundleIds: new Set(),
      };
    }
    const raw = fs.readFileSync(tmpFile, "utf8");
    const data = JSON.parse(raw);
    const apps = collectInstalledAppEntries(data);
    return {
      ok: true,
      apps,
      bundleIds: new Set(apps.map((app) => app.bundleId)),
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      apps: [],
      bundleIds: new Set(),
    };
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
  }
}

function pickPhysicalDeviceWithInstalledBundle({ devices, bundleId }) {
  for (const device of devices) {
    const query = queryPhysicalDeviceApps(device.udid);
    if (!query.ok) {
      continue;
    }
    if (query.bundleIds.has(bundleId)) {
      return device;
    }
  }
  return null;
}

function resolvePhysicalDevice({ requestedUdid, bundleId }) {
  if (requestedUdid) {
    return { udid: requestedUdid, name: requestedUdid };
  }
  const available = getAvailablePhysicalDevices();
  if (available.length === 0) {
    console.error(
      "[probe-runtime] ERROR: no physical iOS device found. Check that a device is connected and trusted (xcrun devicectl list devices)."
    );
    process.exit(1);
  }
  const withInstalledBundle = pickPhysicalDeviceWithInstalledBundle({
    devices: available,
    bundleId,
  });
  if (withInstalledBundle) {
    return withInstalledBundle;
  }
  const first = available[0];
  return first;
}

function resolveIosTarget(options) {
  if (options.physical) {
    const physical = resolvePhysicalDevice({
      requestedUdid: options.physicalDevice,
      bundleId: options.bundleId,
    });
    console.log(
      `[probe-runtime] Auto-selected physical device: ${physical.name} (${physical.udid})`
    );
    return {
      kind: "physical",
      udid: physical.udid,
    };
  }

  if (options.device && options.device !== "booted") {
    return {
      kind: "simulator",
      udid: options.device,
    };
  }

  const booted = getBootedSimulatorDevices();
  if (booted.length > 0) {
    return {
      kind: "simulator",
      udid: booted[0].udid,
    };
  }

  const fallbackPhysical = resolvePhysicalDevice({
    requestedUdid: "",
    bundleId: options.bundleId,
  });
  if (fallbackPhysical) {
    console.log(
      `[probe-runtime] No booted simulator found; falling back to physical device: ${fallbackPhysical.name} (${fallbackPhysical.udid})`
    );
    return {
      kind: "physical",
      udid: fallbackPhysical.udid,
    };
  }

  console.error(
    "[probe-runtime] ERROR: no booted iOS simulator or connected physical iOS device found"
  );
  process.exit(1);
}

function inferChoicelyBundleId(apps, requestedBundleId) {
  const byStudioName = apps.find((app) => {
    const label = `${app.name} ${app.bundleId}`.toLowerCase();
    return label.includes("choicely") && label.includes("studio");
  });
  if (byStudioName) {
    return byStudioName.bundleId;
  }
  const byRequestedPrefix = apps.find((app) =>
    app.bundleId.startsWith(`${requestedBundleId}.`)
  );
  if (byRequestedPrefix) {
    return byRequestedPrefix.bundleId;
  }
  const genericChoicely = apps.find((app) => app.bundleId.toLowerCase().includes("choicely"));
  if (genericChoicely) {
    return genericChoicely.bundleId;
  }
  return "";
}

function ensurePhysicalAppInstalled({ udid, bundleId, bundleIdExplicit }) {
  const query = queryPhysicalDeviceApps(udid);
  if (!query.ok) {
    console.error(
      `[probe-runtime] ERROR: could not query apps on device ${udid}`
    );
    if (query.error) {
      process.stderr.write(`${query.error}\n`);
    }
    process.exit(1);
  }

  if (query.bundleIds.has(bundleId)) {
    return bundleId;
  }

  if (!bundleIdExplicit) {
    const inferredBundleId = inferChoicelyBundleId(query.apps, bundleId);
    if (inferredBundleId) {
      console.log(
        `[probe-runtime] Requested bundle ${bundleId} not found on device; using detected bundle ${inferredBundleId}`
      );
      return inferredBundleId;
    }
  }

  console.error(
    `[probe-runtime] ERROR: app ${bundleId} is not installed on device ${udid}`
  );
  const choicelyBundles = query.apps
    .filter((app) => `${app.bundleId} ${app.name}`.toLowerCase().includes("choicely"))
    .map((app) => app.bundleId);
  if (choicelyBundles.length > 0) {
    console.error(
      `[probe-runtime] Found Choicely-like bundle ids on this device: ${Array.from(new Set(choicelyBundles)).join(", ")}`
    );
  }
  console.error(
    "[probe-runtime] Install via Xcode/xcodebuild, or pass --bundle-id <installed-id>, then re-run probe."
  );
  process.exit(1);
}

/**
 * Launch the app on a physical device and capture its console output
 * (NSLog/RN logs write to stderr which devicectl --console pipes back).
 * Returns the same shape as watchSimulatorLogs: { lines, endedEarly, seenKeys }.
 */
function watchPhysicalDeviceLogs({
  udid,
  bundleId,
  deepLink,
  watchSeconds,
  expectedKeys,
  settleMs,
  terminateExisting,
}) {
  const args = [
    "devicectl",
    "device",
    "process",
    "launch",
    "--device",
    udid,
    "--payload-url",
    deepLink,
    "--console",
    bundleId,
    "--",
    "-choicely_internal_url",
    deepLink,
  ];
  if (terminateExisting) {
    args.splice(6, 0, "--terminate-existing");
  }

  return new Promise((resolve) => {
    const lines = [];
    const seenKeys = new Set();
    const proc = spawn("xcrun", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let timer = null;
    let settleTimer = null;
    let stopping = false;
    let endedEarly = false;

    const hasAllExpectedKeys = () => {
      if (!expectedKeys || expectedKeys.size === 0) {
        return false;
      }
      for (const key of expectedKeys) {
        if (!seenKeys.has(key)) {
          return false;
        }
      }
      return true;
    };

    const stopProcess = () => {
      if (stopping) {
        return;
      }
      stopping = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
      proc.kill("SIGINT");
      setTimeout(() => {
        proc.kill("SIGKILL");
      }, 1500);
    };

    const maybeStopEarly = () => {
      if (!hasAllExpectedKeys()) {
        return;
      }
      if (settleTimer) {
        return;
      }
      settleTimer = setTimeout(() => {
        endedEarly = true;
        stopProcess();
      }, settleMs);
    };

    const collect = (chunk) => {
      const text = String(chunk || "");
      if (!text) {
        return;
      }
      const split = text.split("\n").filter(Boolean);
      for (const line of split) {
        lines.push(line);
        const payload = parseProbePayloadFromLine(line);
        if (!payload) {
          continue;
        }
        const key = payload.key || payload.eventName || "unknown";
        seenKeys.add(key);
        maybeStopEarly();
      }
    };

    proc.stdout.on("data", collect);
    proc.stderr.on("data", collect);

    timer = setTimeout(() => {
      stopProcess();
    }, watchSeconds * 1000);

    proc.on("close", () => {
      if (timer) {
        clearTimeout(timer);
      }
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
      resolve({
        lines,
        endedEarly,
        seenKeys: Array.from(seenKeys),
      });
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const target = resolveIosTarget(options);
  const udid = target.udid;
  let resolvedBundleId = options.bundleId;
  const launchMode = target.kind === "physical"
    ? "launch-arg"
    : (options.useOpenUrl ? "openurl" : "launch-arg");

  if (target.kind === "physical") {
    if (options.useOpenUrl) {
      console.error(
        "[probe-runtime] ERROR: --openurl is only supported for simulators. Remove --openurl or use simulator target."
      );
      process.exit(1);
    }
    resolvedBundleId = ensurePhysicalAppInstalled({
      udid,
      bundleId: options.bundleId,
      bundleIdExplicit: options.bundleIdExplicit,
    });
  } else {
    ensureAppInstalled(udid, resolvedBundleId);
  }

  const deepLink = buildDeepLink(options);
  const expectedKeys = new Set(normalizeEventTokens(options.events));
  console.log(
    `[probe-runtime] Launching iOS runtime probe on ${resolvedBundleId} (${udid})`
  );
  console.log(`[probe-runtime] target_type=${target.kind}`);
  console.log(`[probe-runtime] deep_link=${deepLink}`);
  console.log(`[probe-runtime] launch_mode=${launchMode}`);

  let streamedLines = [];
  let endedEarly = false;

  if (target.kind === "physical") {
    console.log(
      `[probe-runtime] Collecting logs for ${options.watchSeconds}s (physical device console)...`
    );
    ({ lines: streamedLines, endedEarly } = await watchPhysicalDeviceLogs({
      udid,
      bundleId: resolvedBundleId,
      deepLink,
      watchSeconds: options.watchSeconds,
      expectedKeys,
      settleMs: options.settleMs,
      terminateExisting: options.terminateExisting,
    }));
  } else {
    const logPromise = watchSimulatorLogs({
      udid,
      watchSeconds: options.watchSeconds,
      expectedKeys,
      settleMs: options.settleMs,
    });
    await sleep(500);

    if (options.useOpenUrl) {
      runXcrunSync(
        ["simctl", "launch", udid, resolvedBundleId],
        "simctl launch"
      );
      runXcrunSync(
        ["simctl", "openurl", udid, deepLink],
        "simctl openurl"
      );
    } else {
      const launchArgs = [
        "simctl",
        "launch",
        udid,
        resolvedBundleId,
        "-choicely_internal_url",
        deepLink,
      ];
      if (options.terminateExisting) {
        launchArgs.splice(2, 0, "--terminate-running-process");
      }
      runXcrunSync(
        launchArgs,
        "simctl launch with -choicely_internal_url"
      );
    }

    console.log(
      `[probe-runtime] Collecting logs for ${options.watchSeconds}s (simulator log stream)...`
    );
    ({ lines: streamedLines, endedEarly } = await logPromise);
  }

  if (endedEarly) {
    console.log(
      `[probe-runtime] All requested keys observed; ending log capture early (settle ${options.settleMs}ms).`
    );
  }
  let parsedEntries = streamedLines
    .map((line) => parseProbePayloadFromLine(line))
    .filter(Boolean);

  if (parsedEntries.length === 0 && target.kind === "simulator") {
    parsedEntries = fallbackProbeLinesFromLogShow(udid, options.watchSeconds)
      .map((line) => parseProbePayloadFromLine(line))
      .filter(Boolean);
  }

  if (parsedEntries.length === 0) {
    if (streamedLines.length > 0) {
      const sample = streamedLines.slice(-12);
      console.error(
        `[probe-runtime] WARN: captured ${streamedLines.length} physical log line(s), but none matched [BRIDGE_PROBE]. Last ${sample.length} line(s):`
      );
      for (const line of sample) {
        console.error(`  ${line}`);
      }
    }
    console.error(
      "[probe-runtime] ERROR: no bridge probe logs captured. Ensure the app build contains bridge_probe component and iOS host launch override (-choicely_internal_url) support."
    );
    process.exit(1);
  }

  const latestByKey = new Map();
  for (const entry of parsedEntries) {
    const key = entry.key || entry.eventName || "unknown";
    latestByKey.set(key, entry);
  }

  console.log(
    `[probe-runtime] Captured ${parsedEntries.length} probe events (${latestByKey.size} unique keys).`
  );
  console.log("[probe-runtime] Latest result per key:");

  for (const [key, entry] of latestByKey.entries()) {
    const status = entry.status || "unknown";
    const elapsed = entry.elapsedMs != null ? `${entry.elapsedMs}ms` : "-";
    let detail = "";
    if (status === "ok" && entry.response && typeof entry.response === "object") {
      detail = ` responseKeys=${Object.keys(entry.response).join(",")}`;
    } else if (status === "error" && entry.error) {
      detail = ` errorCode=${entry.error.code || "-"} message=${entry.error.message || "-"}`;
    }
    console.log(`  - ${key}: ${status} (${elapsed})${detail}`);
  }

  const errorEntries = parsedEntries.filter((entry) => entry.status === "error");
  if (errorEntries.length > 0) {
    console.log(`[probe-runtime] Error entries (${errorEntries.length}):`);
    for (const entry of errorEntries) {
      const key = entry.key || entry.eventName || "unknown";
      const code = entry.error?.code || "-";
      const message = entry.error?.message || "-";
      console.log(`  - ${key}: ${code} ${message}`);
    }
  }

  if (options.jsonOut) {
    const report = {
      platform: "ios",
      capturedAt: new Date().toISOString(),
      options: {
        events: options.events,
        interactive: options.interactive,
        innerNavigation: options.innerNavigation,
        appKey: options.appKey || null,
        requestTimeoutMs: options.requestTimeoutMs,
        transferProbeOutcome: options.transferProbeOutcome,
        bundleId: options.bundleId,
        resolvedBundleId,
        device: options.device,
        physical: options.physical,
        physicalDevice: options.physicalDevice || null,
        resolvedTarget: target,
        watchSeconds: options.watchSeconds,
        settleMs: options.settleMs,
        launchMode,
      },
      parsedEntries,
      latestByKey: Object.fromEntries(latestByKey.entries()),
    };
    const outPath = path.resolve(process.cwd(), options.jsonOut);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`[probe-runtime] Wrote JSON report to ${outPath}`);
  }
}

main().catch((error) => {
  console.error(`[probe-runtime] ERROR: ${error.message}`);
  process.exit(1);
});
