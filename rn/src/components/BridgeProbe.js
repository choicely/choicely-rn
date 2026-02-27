import React from "react";
import {
  BackHandler,
  Clipboard, // eslint-disable-line -- deprecated but functional in RN 0.82; @react-native-clipboard/clipboard not installed
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { createBridgeClient } from "../bridge/ChoicelyRNBridge";

const LOG_PREFIX = "[BRIDGE_PROBE]";
const DEFAULT_EVENT_TOKENS = ["checkLogin", "getUserInfo", "getToken"];
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;
const TRANSFER_PROBE_TOKEN = "bridge_probe_transfer_v1";
const TRANSFER_PROBE_OUTCOME = {
  success: "success",
  cancel: "cancel",
  live: "live",
};

function normalizeToken(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizePropKey(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/[_-]/g, "").toLowerCase();
}

function getProbePropValue(props, key, aliases = []) {
  if (!props || typeof props !== "object") {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(props, key)) {
    return props[key];
  }

  const normalizedKeys = [key, ...aliases]
    .map((entry) => normalizePropKey(entry))
    .filter(Boolean);
  if (normalizedKeys.length === 0) {
    return undefined;
  }

  for (const [propKey, propValue] of Object.entries(props)) {
    if (normalizedKeys.includes(normalizePropKey(propKey))) {
      return propValue;
    }
  }

  return undefined;
}

function parseBooleanFlag(value, defaultValue = false) {
  if (value == null) {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return defaultValue;
}

function parseIntegerFlag(value, defaultValue, minValue = 1) {
  if (value == null || value === "") {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  return Math.max(minValue, Math.round(parsed));
}

function parseTransferProbeOutcome(value) {
  const normalized = normalizeToken(value).toLowerCase();
  if (normalized === TRANSFER_PROBE_OUTCOME.live) {
    return TRANSFER_PROBE_OUTCOME.live;
  }
  if (
    normalized === TRANSFER_PROBE_OUTCOME.cancel
    || normalized === "cancelled"
  ) {
    return TRANSFER_PROBE_OUTCOME.cancel;
  }
  return TRANSFER_PROBE_OUTCOME.success;
}

function parseEventTokens(eventsParam, includeInteractive) {
  const parsed = typeof eventsParam === "string"
    ? eventsParam
        .split(",")
        .map(normalizeToken)
        .filter(Boolean)
    : [];

  if (parsed.length > 0) {
    return parsed;
  }

  if (includeInteractive) {
    return [...DEFAULT_EVENT_TOKENS, "openLogin", "qrNav"];
  }

  return DEFAULT_EVENT_TOKENS;
}

function toSerializableError(error) {
  if (!error) {
    return { message: "Unknown error" };
  }
  return {
    message: typeof error.message === "string" ? error.message : String(error),
    code: error.code ?? null,
  };
}

function maskSecretValue(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (value.length <= 12) {
    return "***";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function sanitizeForLog(value, parentKey = "") {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, parentKey));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("token")
        || lower.includes("authorization")
        || lower.includes("jwt")
      ) {
        out[key] = maskSecretValue(nested);
      } else {
        out[key] = sanitizeForLog(nested, key);
      }
    }
    return out;
  }
  if (
    typeof value === "string"
    && (parentKey.toLowerCase().includes("token")
      || parentKey.toLowerCase().includes("authorization"))
  ) {
    return maskSecretValue(value);
  }
  return value;
}

function createProbeSteps(
  eventTokens,
  innerNavigation,
  appKey,
  requestTimeoutMs,
  transferProbeOutcome,
  runId
) {
  const probePayloadBase = { probeRunId: runId };
  const transferProbePayload = transferProbeOutcome === TRANSFER_PROBE_OUTCOME.live
    ? null
    : {
      ...probePayloadBase,
      probeToken: TRANSFER_PROBE_TOKEN,
      ...(transferProbeOutcome === TRANSFER_PROBE_OUTCOME.cancel
        ? { probeOutcome: "cancelled" }
        : {}),
    };

  return eventTokens.map((token) => {
    const timeoutMs = requestTimeoutMs;
    switch (token) {
      case "checkLogin":
        return {
          key: token,
          eventName: "choicely:auth:checkLogin",
          timeoutMs,
          payload: probePayloadBase,
        };
      case "getUserInfo":
        return {
          key: token,
          eventName: "choicely:auth:getUserInfo",
          timeoutMs,
          payload: probePayloadBase,
        };
      case "getToken":
        return {
          key: token,
          eventName: "choicely:auth:getToken",
          timeoutMs,
          payload: probePayloadBase,
        };
      case "openLogin":
        return {
          key: token,
          eventName: "choicely:auth:openLogin",
          timeoutMs,
          payload: probePayloadBase,
        };
      case "qrNav":
        return {
          key: token,
          eventName: "choicely:navigation",
          timeoutMs,
          payload: {
            ...probePayloadBase,
            inner_navigation: innerNavigation,
          },
        };
      case "getContext":
        return {
          key: token,
          eventName: "choicely:app:getContext",
          timeoutMs,
          payload: probePayloadBase,
        };
      case "getConfig":
        return {
          key: token,
          eventName: "choicely:app:getConfig",
          timeoutMs,
          payload: probePayloadBase,
        };
      case "getHistory":
        return {
          key: token,
          eventName: "choicely:app:getHistory",
          timeoutMs,
          payload: probePayloadBase,
        };
      case "openCamera":
        return {
          key: token,
          eventName: "choicely:app:openCamera",
          timeoutMs,
          payload: transferProbePayload || probePayloadBase,
        };
      case "uploadImage":
        return {
          key: token,
          eventName: "choicely:app:uploadImage",
          timeoutMs,
          payload: transferProbePayload || probePayloadBase,
        };
      case "uploadFile":
        return {
          key: token,
          eventName: "choicely:app:uploadFile",
          timeoutMs,
          payload: transferProbePayload || probePayloadBase,
        };
      case "appLoad":
        return {
          key: token,
          eventName: "choicely:app:load",
          timeoutMs,
          payload: {
            ...probePayloadBase,
            ...(appKey ? { appKey } : {}),
          },
        };
      case "logout":
        return {
          key: token,
          eventName: "choicely:auth:logout",
          timeoutMs,
          payload: probePayloadBase,
        };
      default:
        return { key: token, unsupported: true };
    }
  });
}

function requestWithTimeout(requestPromise, timeoutMs, stepKey) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return requestPromise;
  }

  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(
        `Bridge request timed out after ${timeoutMs}ms (${stepKey})`
      );
      error.code = "ERR_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([requestPromise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function printProbeLog(payload) {
  console.log(`${LOG_PREFIX} ${JSON.stringify(sanitizeForLog(payload))}`);
}

function renderPayload(payload) {
  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    return String(payload);
  }
}

export default function BridgeProbe(props) {
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [meta, setMeta] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const runningRef = React.useRef(false);
  const lastAutoRunIdRef = React.useRef("");
  const copyTimeoutRef = React.useRef(null);

  const includeInteractive = parseBooleanFlag(
    getProbePropValue(props, "includeInteractive", ["include_interactive"]),
    false
  );
  const autoRun = parseBooleanFlag(
    getProbePropValue(props, "autoRun", ["auto_run"]),
    true
  );
  const runId = normalizeToken(
    getProbePropValue(props, "runId", ["run_id"])
  ) || "default";
  const innerNavigation = normalizeToken(
    getProbePropValue(props, "innerNavigation", ["inner_navigation"])
  )
    || "choicely://open_qr";
  const appKey = normalizeToken(
    getProbePropValue(props, "appKey", ["app_key"])
  );
  const requestTimeoutMs = parseIntegerFlag(
    getProbePropValue(props, "requestTimeoutMs", [
      "request_timeout_ms",
      "requesttimeoutms",
    ]),
    DEFAULT_REQUEST_TIMEOUT_MS,
    1000
  );
  const transferProbeOutcome = parseTransferProbeOutcome(
    getProbePropValue(props, "transferProbeOutcome", [
      "transfer_probe_outcome",
      "transferprobeoutcome",
      "probeOutcome",
      "probe_outcome",
    ])
  );
  const eventsProp = getProbePropValue(props, "events");
  const eventTokens = React.useMemo(
    () => parseEventTokens(eventsProp, includeInteractive),
    [eventsProp, includeInteractive]
  );

  const runProbe = React.useCallback(async () => {
    if (runningRef.current) {
      return;
    }

    const startAtMs = Date.now();
    const nextResults = [];
    const steps = createProbeSteps(
      eventTokens,
      innerNavigation,
      appKey,
      requestTimeoutMs,
      transferProbeOutcome,
      runId
    );
    runningRef.current = true;
    setRunning(true);
    setResults([]);
    setMeta({
      startedAt: new Date(startAtMs).toISOString(),
      eventTokens,
      innerNavigation,
      requestTimeoutMs,
      transferProbeOutcome,
    });

    let bridge = null;
    try {
      bridge = createBridgeClient();
      for (const step of steps) {
        const stepStartMs = Date.now();

        if (step.unsupported) {
          const unsupportedResult = {
            key: step.key,
            status: "error",
            error: { code: "ERR_UNSUPPORTED_TOKEN", message: "Unsupported probe token" },
            elapsedMs: Date.now() - stepStartMs,
          };
          nextResults.push(unsupportedResult);
          printProbeLog(unsupportedResult);
          continue;
        }

        try {
          const response = await requestWithTimeout(
            bridge.request(step.eventName, step.payload), // bridge-lint-ignore: event names are compile-time literals resolved in createProbeSteps switch
            step.timeoutMs,
            step.key
          );
          const responseErrorCode =
            response?.error_code || response?.errorCode || null;
          if (typeof responseErrorCode === "string" && responseErrorCode.trim()) {
            const failureResult = {
              key: step.key,
              eventName: step.eventName,
              payload: step.payload ?? null,
              status: "error",
              error: {
                code: responseErrorCode,
                message:
                  (typeof response?.message === "string" && response.message) ||
                  "Bridge request failed",
              },
              response,
              elapsedMs: Date.now() - stepStartMs,
            };
            nextResults.push(failureResult);
            printProbeLog(failureResult);
            continue;
          }
          const successResult = {
            key: step.key,
            eventName: step.eventName,
            payload: step.payload ?? null,
            timeoutMs: step.timeoutMs ?? null,
            status: "ok",
            elapsedMs: Date.now() - stepStartMs,
            response,
          };
          nextResults.push(successResult);
          printProbeLog(successResult);
        } catch (error) {
          const failedResult = {
            key: step.key,
            eventName: step.eventName,
            payload: step.payload ?? null,
            timeoutMs: step.timeoutMs ?? null,
            status: "error",
            elapsedMs: Date.now() - stepStartMs,
            error: toSerializableError(error),
          };
          nextResults.push(failedResult);
          printProbeLog(failedResult);
        }
      }
    } catch (error) {
      const fatalResult = {
        status: "fatal",
        error: toSerializableError(error),
      };
      nextResults.push(fatalResult);
      printProbeLog(fatalResult);
    } finally {
      if (bridge) {
        bridge.destroy();
      }
      runningRef.current = false;
      setResults(nextResults);
      setMeta((prev) => ({
        ...(prev || {}),
        finishedAt: new Date().toISOString(),
        totalElapsedMs: Date.now() - startAtMs,
        totalSteps: steps.length,
      }));
      setRunning(false);
    }
  }, [appKey, eventTokens, innerNavigation, requestTimeoutMs, runId, transferProbeOutcome]);

  const handleCopyLog = React.useCallback(() => {
    const text = JSON.stringify({ session: meta, results }, null, 2);
    Clipboard.setString(text);
    setCopied(true);
    clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [meta, results]);

  React.useEffect(() => {
    if (!autoRun) {
      return;
    }
    if (lastAutoRunIdRef.current === runId) {
      return;
    }
    lastAutoRunIdRef.current = runId;
    runProbe();
  }, [autoRun, runId, runProbe]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {Platform.OS === "android" && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => BackHandler.exitApp()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>Bridge Probe</Text>
      <Text style={styles.subtitle}>
        Runtime bridge verification on connected host app.
      </Text>

      <View style={styles.configCard}>
        <Text style={styles.configLabel}>events</Text>
        <Text style={styles.configValue}>{eventTokens.join(", ") || "-"}</Text>
        <Text style={styles.configLabel}>innerNavigation</Text>
        <Text style={styles.configValue}>{innerNavigation}</Text>
        <Text style={styles.configLabel}>requestTimeoutMs</Text>
        <Text style={styles.configValue}>{requestTimeoutMs}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, running && styles.buttonDisabled]}
        onPress={runProbe}
        activeOpacity={0.8}
        disabled={running}
      >
        <Text style={styles.buttonText}>
          {running ? "Running..." : "Run Probe"}
        </Text>
      </TouchableOpacity>

      {meta && (
        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>Session</Text>
          <Text style={styles.metaText}>{renderPayload(meta)}</Text>
        </View>
      )}

      <View style={styles.resultsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.metaTitle}>Results</Text>
          {meta != null && (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyLog}
              activeOpacity={0.7}
            >
              <Text style={styles.copyButtonText}>
                {copied ? "Copied!" : "Copy log"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {results.length === 0 ? (
          <Text style={styles.emptyText}>No results yet.</Text>
        ) : (
          <Text style={styles.metaText}>{renderPayload(results)}</Text>
        )}
      </View>
    </ScrollView>
  );
}

export const rootOptions = {
  disableScrollView: true,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  configCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
  },
  configLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
    textTransform: "uppercase",
  },
  configValue: {
    color: "#E5E7EB",
    fontSize: 13,
    marginTop: 2,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#475569",
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  metaCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
  },
  resultsCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
  },
  metaTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  metaText: {
    color: "#D1D5DB",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  backButtonText: {
    color: "#60A5FA",
    fontSize: 15,
    fontWeight: "600",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copyButton: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#1E3A5F",
  },
  copyButtonText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "600",
  },
});
