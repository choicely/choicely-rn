import { NativeEventEmitter, NativeModules } from "react-native";

const { ChoicelyRNBridge } = NativeModules;

export const BRIDGE_EVENT_NAME = "ChoicelyBridgeEvent";
export const BRIDGE_REQUEST_EVENT_KEY = "event_name";

function ensureBridge() {
  if (!ChoicelyRNBridge) {
    throw new Error("ChoicelyRNBridge native module is not registered");
  }
}

function isObjectPayload(payload) {
  return (
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
  );
}

export function createBridgeClient({ onEvent } = {}) {
  ensureBridge();

  const emitter = new NativeEventEmitter(ChoicelyRNBridge);
  const subscription = onEvent
    ? emitter.addListener(BRIDGE_EVENT_NAME, onEvent)
    : null;

  const request = (eventName, payload) => {
    if (!eventName) {
      return Promise.reject(new Error("eventName is required"));
    }

    const args = { [BRIDGE_REQUEST_EVENT_KEY]: eventName };

    if (payload !== undefined) {
      if (!isObjectPayload(payload)) {
        return Promise.reject(
          new Error("payload must be an object when provided")
        );
      }
      if (
        Object.prototype.hasOwnProperty.call(payload, BRIDGE_REQUEST_EVENT_KEY)
      ) {
        return Promise.reject(
          new Error(
            `payload must not contain reserved key "${BRIDGE_REQUEST_EVENT_KEY}"`
          )
        );
      }
      Object.assign(args, payload);
    }

    if (typeof ChoicelyRNBridge.request === "function") {
      return ChoicelyRNBridge.request(args);
    }

    return Promise.reject(
      new Error("ChoicelyRNBridge.request is not available")
    );
  };

  const destroy = () => {
    if (subscription) {
      subscription.remove();
    }
  };

  return { request, destroy };
}
