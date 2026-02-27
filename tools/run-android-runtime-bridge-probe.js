#!/usr/bin/env node

const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const readline = require("readline");

function printUsage() {
  console.log(`
Usage: node ./tools/run-android-runtime-bridge-probe.js [options]

Options:
  --events <csv>              Probe tokens (default: checkLogin,getUserInfo,getToken)
  --interactive               Add openLogin and qrNav to probe events
  --inner-navigation <url>    inner_navigation for qrNav (default: choicely://open_qr)
  --app-key <key>             appKey passed to appLoad token payload
  --request-timeout-ms <n>    Timeout per bridge request inside bridge_probe (default: 12000)
  --transfer-probe-outcome <success|cancel|live>
                              Transfer probe behavior (default: success)
  --app-id <id>               Android package id (default: com.choicely.studio)
  --activity <name>           Activity class (default: com.choicely.sdk.activity.splash.SplashActivity)
  --serial <id>               Device serial (uses ANDROID_SERIAL when omitted)
  --list-serials              List connected online Android serials and exit
  --select-serial             Select serial interactively (arrow keys)
  --watch-seconds <n>         Logcat watch duration (default: 12)
  --settle-ms <n>             Extra wait after all requested keys are seen (default: 900)
  --json-out <path>           Write parsed probe report JSON
  --no-force-stop             Do not use am start -S before launch
  --no-clear-logcat           Skip adb logcat -c before launch
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
    appId: "com.choicely.studio",
    activity: "com.choicely.sdk.activity.splash.SplashActivity",
    serial: process.env.ANDROID_SERIAL || "",
    listSerials: false,
    selectSerial: false,
    watchSeconds: 12,
    settleMs: 900,
    jsonOut: "",
    forceStop: true,
    clearLogcat: true,
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
      case "--app-id":
        options.appId = argv[i + 1] || options.appId;
        i += 1;
        break;
      case "--activity":
        options.activity = argv[i + 1] || options.activity;
        i += 1;
        break;
      case "--serial":
        options.serial = argv[i + 1] || options.serial;
        i += 1;
        break;
      case "--list-serials":
        options.listSerials = true;
        break;
      case "--select-serial":
        options.selectSerial = true;
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
      case "--no-force-stop":
        options.forceStop = false;
        break;
      case "--no-clear-logcat":
        options.clearLogcat = false;
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

function resolveAdbPath() {
  const envAdb = process.env.ADB;
  if (envAdb && envAdb.trim()) {
    return envAdb.trim();
  }
  const home = process.env.HOME;
  if (home) {
    const candidate = path.join(home, "Library/Android/sdk/platform-tools/adb");
    return candidate;
  }
  return "adb";
}

function parseProbePayloadFromLine(line) {
  const marker = "[BRIDGE_PROBE]";
  const markerIndex = line.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }
  const jsonStart = line.indexOf("{", markerIndex);
  if (jsonStart < 0) {
    return null;
  }
  try {
    return JSON.parse(line.slice(jsonStart));
  } catch (error) {
    return null;
  }
}

function runAdbResult(adbPath, serial, adbArgs) {
  const args = serial ? ["-s", serial, ...adbArgs] : adbArgs;
  return spawnSync(adbPath, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runAdbSync(adbPath, serial, adbArgs, label) {
  const result = runAdbResult(adbPath, serial, adbArgs);
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

function getPackageFromComponent(component) {
  if (typeof component !== "string") {
    return "";
  }
  const slashIndex = component.indexOf("/");
  if (slashIndex <= 0) {
    return "";
  }
  return component.slice(0, slashIndex);
}

function getTopActivity(adbPath, serial) {
  const activityResult = runAdbResult(
    adbPath,
    serial,
    ["shell", "dumpsys", "activity", "activities"]
  );
  const activityText = `${activityResult.stdout || ""}\n${activityResult.stderr || ""}`;
  const activityPatterns = [
    /mResumedActivity:[^\n]*\s([A-Za-z0-9._$]+\/[A-Za-z0-9._$]+)/,
    /topResumedActivity=[^\n]*\s([A-Za-z0-9._$]+\/[A-Za-z0-9._$]+)/,
    /mFocusedActivity:[^\n]*\s([A-Za-z0-9._$]+\/[A-Za-z0-9._$]+)/,
  ];
  for (const pattern of activityPatterns) {
    const match = activityText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  const windowResult = runAdbResult(
    adbPath,
    serial,
    ["shell", "dumpsys", "window", "windows"]
  );
  const windowText = `${windowResult.stdout || ""}\n${windowResult.stderr || ""}`;
  const windowMatch = windowText.match(
    /mCurrentFocus=[^\n]*\s([A-Za-z0-9._$]+\/[A-Za-z0-9._$]+)\}?/
  );
  if (windowMatch && windowMatch[1]) {
    return windowMatch[1];
  }
  return "";
}

function getOnlineDevices(adbPath) {
  const output = runAdbSync(adbPath, "", ["devices", "-l"], "adb devices -l");
  const rows = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices attached"));

  return rows
    .map((line) => {
      const parts = line.split(/\s+/);
      if (parts.length < 2) {
        return null;
      }
      const serial = parts[0];
      const state = parts[1];
      const meta = {};
      for (const token of parts.slice(2)) {
        const delimiterIndex = token.indexOf(":");
        if (delimiterIndex <= 0) {
          continue;
        }
        const key = token.slice(0, delimiterIndex);
        const value = token.slice(delimiterIndex + 1);
        meta[key] = value;
      }
      return { serial, state, meta };
    })
    .filter(Boolean)
    .filter((entry) => entry.state === "device");
}

function ensureDeviceConnected(adbPath, serial) {
  const onlineDevices = getOnlineDevices(adbPath);
  const online = onlineDevices.map((entry) => entry.serial);
  if (online.length === 0) {
    console.error("[probe-runtime] ERROR: no online Android device/emulator found");
    process.exit(1);
  }
  if (serial && !online.includes(serial)) {
    console.error(
      `[probe-runtime] ERROR: requested serial ${serial} is not connected (online: ${online.join(", ")})`
    );
    process.exit(1);
  }
  return onlineDevices;
}

function formatDeviceLabel(device) {
  const kind = device.serial.startsWith("emulator-") ? "emulator" : "device";
  const model = device.meta.model || device.meta.device || "unknown";
  return `${device.serial} (${kind}, model=${model})`;
}

function printDeviceList(devices) {
  console.log("[probe-runtime] Connected Android targets:");
  for (const device of devices) {
    console.log(`  - ${formatDeviceLabel(device)}`);
  }
}

function chooseSerialFromList(devices) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      "[probe-runtime] ERROR: interactive serial selection requires a TTY. Pass --serial instead."
    );
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    let selectedIndex = 0;
    let renderedLines = 0;
    let settled = false;

    const cleanup = () => {
      if (settled) {
        return;
      }
      settled = true;
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdin.removeListener("keypress", onKeypress);
      process.stdout.write("\x1b[?25h");
      if (renderedLines > 0) {
        readline.moveCursor(process.stdout, 0, -renderedLines);
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);
      }
    };

    const render = () => {
      if (renderedLines > 0) {
        readline.moveCursor(process.stdout, 0, -renderedLines);
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);
      }
      const lines = [
        "[probe-runtime] Select Android device/emulator (↑/↓ and Enter):",
        ...devices.map((device, index) => {
          const marker = index === selectedIndex ? "❯" : " ";
          return `${marker} ${formatDeviceLabel(device)}`;
        }),
        "[probe-runtime] Press Ctrl+C to cancel.",
      ];
      process.stdout.write(`${lines.join("\n")}\n`);
      renderedLines = lines.length;
    };

    const onKeypress = (_str, key) => {
      if (!key) {
        return;
      }
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Selection cancelled"));
        return;
      }
      if (key.name === "up") {
        selectedIndex = selectedIndex === 0 ? devices.length - 1 : selectedIndex - 1;
        render();
        return;
      }
      if (key.name === "down") {
        selectedIndex = selectedIndex === devices.length - 1 ? 0 : selectedIndex + 1;
        render();
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        const selected = devices[selectedIndex];
        cleanup();
        resolve(selected.serial);
      }
    };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
    process.stdout.write("\x1b[?25l");
    render();
  });
}

function buildInternalUrl(options) {
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteForAdbShell(value) {
  const text = String(value ?? "");
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

function normalizeEventTokens(csv) {
  return String(csv || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function watchLogcat({
  adbPath,
  serial,
  watchSeconds,
  expectedKeys,
  settleMs,
}) {
  const args = serial
    ? [
        "-s",
        serial,
        "logcat",
        "-v",
        "time",
        "ReactNativeJS:I",
        "ChoicelyRNBridge:D",
        "*:S",
      ]
    : ["logcat", "-v", "time", "ReactNativeJS:I", "ChoicelyRNBridge:D", "*:S"];

  return new Promise((resolve) => {
    const lines = [];
    const seenKeys = new Set();
    const proc = spawn(adbPath, args, {
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

    const stopLogcat = () => {
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
        stopLogcat();
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
      stopLogcat();
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
  const adbPath = resolveAdbPath();

  const onlineDevices = ensureDeviceConnected(adbPath, options.serial);
  if (options.listSerials) {
    printDeviceList(onlineDevices);
    return;
  }

  if (options.selectSerial) {
    if (onlineDevices.length === 1) {
      options.serial = onlineDevices[0].serial;
    } else {
      options.serial = await chooseSerialFromList(onlineDevices);
    }
    console.log(`[probe-runtime] Selected serial=${options.serial}`);
  } else if (!options.serial && onlineDevices.length === 1) {
    options.serial = onlineDevices[0].serial;
  } else if (!options.serial && onlineDevices.length > 1) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      options.serial = await chooseSerialFromList(onlineDevices);
      console.log(`[probe-runtime] Selected serial=${options.serial}`);
    } else {
      printDeviceList(onlineDevices);
      console.error(
        "[probe-runtime] ERROR: multiple Android targets detected. Pass --serial or use --select-serial."
      );
      process.exit(1);
    }
  }

  if (options.clearLogcat) {
    runAdbSync(adbPath, options.serial, ["logcat", "-c"], "adb logcat -c");
  }

  const internalUrl = buildInternalUrl(options);
  const component = `${options.appId}/${options.activity}`;
  const expectedKeys = new Set(normalizeEventTokens(options.events));

  console.log(`[probe-runtime] Launching runtime probe on ${component}`);
  console.log(`[probe-runtime] internal_url=${internalUrl}`);

  const logPromise = watchLogcat({
    adbPath,
    serial: options.serial,
    watchSeconds: options.watchSeconds,
    expectedKeys,
    settleMs: options.settleMs,
  });
  await sleep(500);

  const launchArgs = [
    "shell",
    "am",
    "start",
    "-W",
  ];
  if (options.forceStop) {
    launchArgs.push("-S");
  }
  launchArgs.push(
    "-a",
    "android.intent.action.VIEW",
    "-n",
    component,
    "--es",
    "intent_choicely_content_type",
    "special",
    "--es",
    "intent_internal_url",
    quoteForAdbShell(internalUrl)
  );
  if (options.transferProbeOutcome && options.transferProbeOutcome !== "success") {
    launchArgs.push(
      "--es",
      "intent_transfer_probe_outcome",
      quoteForAdbShell(options.transferProbeOutcome)
    );
  }

  const launchOutput = runAdbSync(
    adbPath,
    options.serial,
    launchArgs,
    "adb shell am start"
  );
  if (/^Error:/m.test(launchOutput) || /does not exist/i.test(launchOutput)) {
    console.error("[probe-runtime] ERROR: activity launch failed");
    process.stderr.write(launchOutput);
    process.exit(1);
  }
  let launchedActivity = "";
  const launchedActivityMatch = launchOutput.match(/Activity:\s+([^\s]+)/);
  if (launchedActivityMatch) {
    launchedActivity = launchedActivityMatch[1];
  }
  if (launchedActivity && launchedActivity !== component) {
    console.warn(
      `[probe-runtime] WARN: top activity is ${launchedActivity} (expected ${component}).`
    );
    console.warn(
      "[probe-runtime] WARN: close the foreground activity (for example camera/file picker) and re-run probe."
    );
    const launchedPackage = getPackageFromComponent(launchedActivity);
    if (launchedPackage && launchedPackage !== options.appId) {
      console.warn(
        `[probe-runtime] WARN: attempting recovery by stopping ${launchedPackage} and relaunching host app.`
      );
      runAdbResult(adbPath, options.serial, [
        "shell",
        "am",
        "force-stop",
        launchedPackage,
      ]);
      runAdbResult(adbPath, options.serial, [
        "shell",
        "input",
        "keyevent",
        "KEYCODE_HOME",
      ]);
      await sleep(450);
      const recoveryLaunchOutput = runAdbSync(
        adbPath,
        options.serial,
        launchArgs,
        "adb shell am start (recovery)"
      );
      const recoveryMatch = recoveryLaunchOutput.match(/Activity:\s+([^\s]+)/);
      if (recoveryMatch && recoveryMatch[1] !== component) {
        console.warn(
          `[probe-runtime] WARN: recovery launch still foregrounded ${recoveryMatch[1]} (expected ${component}).`
        );
      }
    }
  }

  console.log(
    `[probe-runtime] Collecting logs for ${options.watchSeconds}s (ReactNativeJS + ChoicelyRNBridge)...`
  );
  const { lines, endedEarly } = await logPromise;
  if (endedEarly) {
    console.log(
      `[probe-runtime] All requested keys observed; ending log capture early (settle ${options.settleMs}ms).`
    );
  }
  const probeLines = lines.filter((line) => line.includes("[BRIDGE_PROBE]"));
  if (probeLines.length === 0) {
    const topActivity = getTopActivity(adbPath, options.serial);
    if (topActivity) {
      console.error(
        `[probe-runtime] ERROR: no bridge probe logs captured and top activity is ${topActivity}.`
      );
      if (topActivity !== component) {
        console.error(
          "[probe-runtime] HINT: close/exit the foreground native picker activity (camera/files), then re-run probe."
        );
      }
    }
    console.error(
      "[probe-runtime] ERROR: no bridge probe logs captured. Ensure the app build contains bridge_probe component, foreground activity is the host app, and device is running latest build."
    );
    process.exit(1);
  }

  const parsedEntries = probeLines
    .map((line) => parseProbePayloadFromLine(line))
    .filter(Boolean);

  if (parsedEntries.length === 0) {
    console.error(
      "[probe-runtime] ERROR: probe logs were found but payload parsing failed"
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
      platform: "android",
      capturedAt: new Date().toISOString(),
      options: {
        events: options.events,
        interactive: options.interactive,
        innerNavigation: options.innerNavigation,
        appKey: options.appKey || null,
        requestTimeoutMs: options.requestTimeoutMs,
        transferProbeOutcome: options.transferProbeOutcome,
        appId: options.appId,
        activity: options.activity,
        serial: options.serial || null,
        watchSeconds: options.watchSeconds,
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
