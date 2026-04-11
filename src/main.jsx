import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import App from "./App";
import "./index.css";
import { logNativeCapabilities } from "./utils/nativeCapabilities";

// Print the native plugin registry once at boot so a stale APK
// (JS bundle newer than the installed native shell) is immediately
// visible in adb logcat / Safari web inspector, instead of showing
// up later as a misleading "Could not access the camera" error.
logNativeCapabilities();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);