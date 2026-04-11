import { useState } from "react";
import { useTranslation } from "react-i18next";
import { findMissingNativePlugins, isNativeBuildStale } from "../utils/nativeCapabilities";

// Non-blocking banner that appears at the top of the app when the
// installed native shell (Android APK / iOS IPA) is missing one or
// more of the Capacitor plugins that the current JS bundle expects.
//
// This is a user-facing surface for the "stale APK" condition that
// nativeCapabilities.js detects. Without this banner the only
// symptom of a stale build is that Camera / BarcodeScanner / etc.
// feature buttons fail with an error at click time; with the banner
// the user (and the developer watching over their shoulder) sees
// the root cause the moment they open the app.
//
// Dismissal is deliberately session-scoped, not persisted: next
// time the app boots, if the APK is still stale, the banner shows
// again. We don't want a one-time dismiss to silence a real
// architectural problem forever.
export default function NativeStaleBuildBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  // Cheap check: reads an in-memory array that was populated at
  // WebView startup. No re-renders needed — the plugin set cannot
  // change while the app is running.
  if (dismissed) return null;
  if (!isNativeBuildStale()) return null;

  const missing = findMissingNativePlugins();

  return (
    <div
      role="alert"
      style={{
        background: "#fef3c7",
        color: "#78350f",
        border: "1px solid #f59e0b",
        borderRadius: 12,
        padding: "10px 12px",
        margin: "0 0 12px 0",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <div style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>⚠️</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>
          {t("nativeStale.title")}
        </div>
        <div>{t("nativeStale.body", { plugins: missing.join(", ") })}</div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("nativeStale.dismiss")}
        style={{
          background: "transparent",
          border: "none",
          color: "#78350f",
          fontSize: 18,
          lineHeight: 1,
          cursor: "pointer",
          padding: "0 4px",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
