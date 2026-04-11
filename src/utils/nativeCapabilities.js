import { Capacitor } from "@capacitor/core";

// ---------------------------------------------------------------
// Native capability detection
// ---------------------------------------------------------------
//
// When FuelTrack runs as a PWA in a browser, Capacitor plugins
// transparently fall back to web implementations (e.g. getUserMedia
// for @capacitor/camera). When it runs inside the Android shell,
// Capacitor's native bridge routes plugin calls to the Java/Kotlin
// implementations compiled into the APK.
//
// There is a third case that is very easy to hit in practice:
// the APK is stale. The JS bundle (served from fueltrack.me because
// capacitor.config.ts sets `server.url`) imports a plugin that was
// added *after* the APK was last built, so there is no matching
// native implementation in the installed app. In that case Capacitor
// silently routes the call to the plugin's *web* implementation —
// see the branch in @capacitor/core/dist/index.js where `pluginHeader`
// is undefined but `impl` exists. For Camera this means getUserMedia
// runs inside the Android WebView and the user gets a confusing
// "Could not access the camera" error even though everything in the
// JS code looks right.
//
// To prevent that silent-fallback debugging nightmare, we maintain
// an explicit list of native plugins required by the current JS
// bundle and check it against Capacitor's internal `PluginHeaders`
// array at runtime. `PluginHeaders` is populated by the native shell
// at WebView startup with one entry per plugin that the APK has
// compiled in, so it is the single source of truth for "does this
// APK actually know about plugin X".
//
// Adding a new native plugin:
//   1. npm install @capacitor/<plugin>
//   2. npx cap sync android
//   3. Add the plugin's registerPlugin name (not the npm package name)
//      to REQUIRED_NATIVE_PLUGINS below.
//   4. Rebuild the APK (Android Studio Run, or ./gradlew installDebug).
//      Until step 4 happens on every installed device, the banner in
//      NativeStaleBuildBanner.jsx will warn the user that their app
//      is out of date.

// registerPlugin() names, not npm package names. Cross-checked against
// node_modules/@capacitor/camera/dist/esm/index.js and
// node_modules/@capacitor-mlkit/barcode-scanning/dist/esm/index.js
// when Phase A3 landed.
export const REQUIRED_NATIVE_PLUGINS = ["Camera", "BarcodeScanner"];

// Reads window.Capacitor.PluginHeaders defensively. The field is
// typed as readonly PluginHeader[] in @capacitor/core's internal
// definitions (definitions-internal.d.ts, line 27) but is considered
// an internal API, so we don't assume anything about its shape beyond
// "array of { name }".
function getNativePluginHeaders() {
  if (typeof window === "undefined") return [];
  const cap = window.Capacitor;
  if (!cap) return [];
  const headers = cap.PluginHeaders;
  return Array.isArray(headers) ? headers : [];
}

// True when running inside a Capacitor native shell *and* the given
// plugin has a native implementation registered in this build. Returns
// false on web (no PluginHeaders) and false on a stale native build
// that was compiled before the plugin was added.
export function hasNativePlugin(name) {
  if (!Capacitor.isNativePlatform()) return false;
  return getNativePluginHeaders().some((h) => h && h.name === name);
}

// Names of REQUIRED_NATIVE_PLUGINS that are not present in the current
// native shell. Always returns [] on web, since web plugins are never
// "missing" — they just use their JS implementation. Only native
// shells can be stale.
export function findMissingNativePlugins() {
  if (!Capacitor.isNativePlatform()) return [];
  const registered = new Set(
    getNativePluginHeaders()
      .map((h) => h && h.name)
      .filter(Boolean)
  );
  return REQUIRED_NATIVE_PLUGINS.filter((name) => !registered.has(name));
}

// True if we are on a native platform and at least one required
// plugin is missing from the installed APK/IPA. Used by the stale
// build banner and by individual feature gates.
export function isNativeBuildStale() {
  return findMissingNativePlugins().length > 0;
}

// One-time boot-time diagnostic so any future "why isn't the camera
// working" question can be answered instantly from adb logcat /
// Safari web inspector instead of guessing. Safe to call on web; it
// just prints platform=web and no missing plugins.
let _loggedNativeCapabilities = false;
export function logNativeCapabilities() {
  if (_loggedNativeCapabilities) return;
  _loggedNativeCapabilities = true;
  const platform = Capacitor.getPlatform();
  const registered = getNativePluginHeaders()
    .map((h) => h && h.name)
    .filter(Boolean);
  const missing = findMissingNativePlugins();
  console.info(
    `[FT] native-capabilities platform=${platform} ` +
      `required=[${REQUIRED_NATIVE_PLUGINS.join(",")}] ` +
      `registered=[${registered.join(",")}] ` +
      `missing=[${missing.join(",")}]`
  );
}
