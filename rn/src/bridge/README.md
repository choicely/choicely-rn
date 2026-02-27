# Choicely Bridge

## Contract

- RN calls native through `createBridgeClient().request(eventName, payload)`.
- Native request args use `event_name` plus a flat payload object.
- `payload` must be a plain object (no arrays, no nested wrapper key).
- `event_name` is reserved and cannot appear inside `payload`.

## JS usage

```js
import { createBridgeClient } from "./ChoicelyRNBridge";

const bridge = createBridgeClient();
const auth = await bridge.request("choicely:auth:checkLogin");
bridge.destroy();
```

## Supported Request Events

- `choicely:auth:getToken`
- `choicely:auth:checkLogin`
- `choicely:auth:getUserInfo`
- `choicely:auth:openLogin`
- `choicely:auth:logout`
- `choicely:app:getContext`
- `choicely:app:getConfig`
- `choicely:app:getHistory`
- `choicely:app:load`
- `choicely:app:store`
- `choicely:app:remove`
- `choicely:app:uploadFile`
- `choicely:app:uploadImage`
- `choicely:app:openCamera`
- `choicely:navigation`

## Bridge lint

- Run `npm run lint` from `choicely-rn/`.
- It runs ESLint and verifies RN `bridge.request("...")` event names are registered in native handlers.

## Host verification

- Run `node ./tools/verify-host-bridge.js` to validate dashboard login/QR request flows, RN envelope shape, and iOS host dispatch contracts.
  - If a compiled `ChoicelyReactNative.framework` exists in Xcode DerivedData, the verifier also checks compiled bridge tokens (`event_name`, `error_code`, `choicely://open_qr`, auth/navigation events).
- Run `node ./tools/verify-font-assets.js` to validate icon font declarations, wrapper coverage, and source asset integrity.

## iOS Runtime Probe

- Run `node ./tools/run-ios-runtime-bridge-probe.js` to trigger `bridge_probe` on a booted iOS simulator and capture real bridge outputs from simulator logs.
- Default mode uses simulator launch argument `-choicely_internal_url` (no manual "Open in app?" prompt needed).
- Run `node ./tools/run-ios-runtime-bridge-probe.js --events checkLogin,getUserInfo,getToken,getContext,getConfig,getHistory,openLogin,qrNav --watch-seconds 16` for broader runtime coverage.
- Run `node ./tools/run-ios-runtime-bridge-probe.js --events checkLogin,getUserInfo,getToken,getContext,getConfig,getHistory,openCamera,uploadImage,uploadFile --transfer-probe-outcome cancel --watch-seconds 16` to simulate transfer cancellation (`ERR_CANCELLED`) without opening native pickers.
- Optional args:
  - `node ./tools/run-ios-runtime-bridge-probe.js --events checkLogin,getUserInfo,getToken`
  - `node ./tools/run-ios-runtime-bridge-probe.js --interactive`
  - `node ./tools/run-ios-runtime-bridge-probe.js --watch-seconds 20`
  - `node ./tools/run-ios-runtime-bridge-probe.js --openurl`
  - `node ./tools/run-ios-runtime-bridge-probe.js --bundle-id com.choicely.studio.dev --device <SIMULATOR_UDID>`

## Android Runtime Probe

- Run `node ./tools/run-android-runtime-bridge-probe.js` to launch the host app into `bridge_probe` and capture real bridge outputs from `logcat`.
- Run `node ./tools/run-android-runtime-bridge-probe.js --events checkLogin,getUserInfo,getToken,getContext,getConfig,getHistory,openLogin,qrNav --watch-seconds 16` for broader runtime coverage.
- Run `node ./tools/run-android-runtime-bridge-probe.js --events checkLogin,getUserInfo,getToken,getContext,getConfig,getHistory,openCamera,uploadImage,uploadFile --transfer-probe-outcome cancel --watch-seconds 16` to simulate transfer cancellation (`ERR_CANCELLED`) without opening native pickers.
- Optional args:
  - `node ./tools/run-android-runtime-bridge-probe.js --events checkLogin,getUserInfo,getToken`
  - `node ./tools/run-android-runtime-bridge-probe.js --interactive`
  - `node ./tools/run-android-runtime-bridge-probe.js --watch-seconds 20`

## Runtime Contract Verification

- Run `npm run lint:runtime` to execute strict runtime probe + response-shape checks, including native transfer events (`openCamera`, `uploadImage`, `uploadFile`).
- During transfer checks, either complete the picker flow or cancel it; `ERR_CANCELLED` is accepted, but stalled requests fail with `ERR_TIMEOUT`.
- Run `npm run lint:runtime -- --transfer-probe-outcome cancel` to enforce cancellation-path validation for all transfer events.
- On simulators without camera hardware, `openCamera` may return `ERR_IMAGE_PICKER`; this is treated as an environment pass.
- Run `node ./tools/verify-runtime-bridge-contract.js` for non-strict mode.
- Run `node ./tools/verify-runtime-bridge-contract.js --include-transfer --watch-seconds 40 --request-timeout-ms 12000` to run the expanded transfer-aware contract checks directly.
