import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner as MlkitBarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { hasNativePlugin } from "../utils/nativeCapabilities";

// Capacitor native uses Google's ML Kit barcode scanner, which opens
// its own full-screen camera UI, handles permissions, and returns
// scanned codes. Web still uses @zxing/library against a <video>.
//
// IS_NATIVE_SHELL tells us whether we're running inside the
// Android/iOS app at all. HAS_NATIVE_BARCODE tells us whether that
// app actually has @capacitor-mlkit/barcode-scanning compiled in —
// it can be false when the APK is stale (built before Phase A3).
// If we don't check HAS_NATIVE_BARCODE and just gate on IS_NATIVE,
// calling MlkitBarcodeScanner.scan() on a stale APK throws "plugin
// not implemented" and we render the zxing <video> fallback against
// a black WebView that has no camera access — a very confusing
// failure mode. Instead we detect the stale state up front and show
// a clear "please update the app" message.
const IS_NATIVE_SHELL = Capacitor.isNativePlatform();
const HAS_NATIVE_BARCODE = hasNativePlugin("BarcodeScanner");

// Product barcode formats we care about for food lookups.
const SCAN_FORMATS = [
  BarcodeFormat.Ean8,
  BarcodeFormat.Ean13,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128,
  BarcodeFormat.Code39,
];

export default function BarcodeScanner({ onResult, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  // Initialize the error state directly for the stale-APK case so
  // the first render already shows the update-required message
  // instead of briefly rendering an empty <video> before the effect
  // runs.
  const [error, setError] = useState(() =>
    IS_NATIVE_SHELL && !HAS_NATIVE_BARCODE ? t("barcode.updateRequired") : ""
  );
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Stale APK: we already surfaced the error from useState. Don't
    // try the @zxing <video> fallback — it can't access the camera
    // from inside the Android WebView anyway.
    if (IS_NATIVE_SHELL && !HAS_NATIVE_BARCODE) {
      return;
    }

    if (HAS_NATIVE_BARCODE) {
      // On native we use the ML Kit full-screen scanner. But first
      // we need to ensure the Google Barcode Scanner module is
      // downloaded — on fresh installs (especially emulators) it
      // isn't available yet and scan() throws
      // "The Google Barcode Scanner Module is not available".
      let cancelled = false;
      (async () => {
        try {
          // Check if the ML Kit module is downloaded
          const { available } = await MlkitBarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
          if (cancelled) return;

          if (!available) {
            // Trigger download and wait for completion
            setInstalling(true);
            await new Promise((resolve, reject) => {
              const listener = MlkitBarcodeScanner.addListener(
                "googleBarcodeScannerModuleInstallProgress",
                (event) => {
                  // state 4 = COMPLETED, 5 = FAILED, 3 = CANCELED
                  if (event.state === 4) {
                    listener.then(h => h.remove());
                    resolve();
                  } else if (event.state === 5 || event.state === 3) {
                    listener.then(h => h.remove());
                    reject(new Error("Module install failed"));
                  }
                }
              );
              MlkitBarcodeScanner.installGoogleBarcodeScannerModule().catch(reject);
            });
            if (cancelled) return;
            setInstalling(false);
          }

          const { barcodes } = await MlkitBarcodeScanner.scan({ formats: SCAN_FORMATS });
          if (cancelled) return;
          const code = barcodes?.[0]?.rawValue || barcodes?.[0]?.displayValue;
          if (code) onResult(code);
          else onClose();
        } catch (err) {
          if (cancelled) return;
          setInstalling(false);
          const msg = String(err?.message || err || "").toLowerCase();
          if (msg.includes("cancel")) {
            onClose();
            return;
          }
          setError(t("barcode.cameraError"));
        }
      })();
      return () => { cancelled = true; };
    }

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(null, videoRef.current, (result) => {
      if (result) {
        reader.reset();
        onResult(result.getText());
      }
    }).catch(() => {
      setError(t("barcode.cameraError"));
    });

    return () => {
      reader.reset();
    };
  }, []);

  // On native the ML Kit modal covers the whole screen — no need to
  // render our own overlay. Only keep a minimal fallback for the rare
  // error case, the stale-APK updateRequired message, or while we
  // wait for the ML Kit module to download.
  if (HAS_NATIVE_BARCODE && !error && !installing) {
    return null;
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.9)",
      zIndex: 300,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 20
    }}>
      <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>
        📷 {t("barcode.title")}
      </div>

      {installing ? (
        <div style={{ color: "rgba(255,255,255,0.8)", textAlign: "center", fontSize: 14 }}>
          {t("barcode.installing")}
        </div>
      ) : error ? (
        <div style={{ color: "#fca5a5", textAlign: "center", fontSize: 14 }}>
          {error}
        </div>
      ) : (
        <>
          <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
            <video
              ref={videoRef}
              style={{ width: "100%", borderRadius: 16 }}
              muted
              playsInline
            />
            <div style={{
              position: "absolute",
              inset: 0,
              border: "3px solid #22c55e",
              borderRadius: 16,
              pointerEvents: "none"
            }} />
            <div style={{
              position: "absolute",
              top: "50%",
              left: "10%",
              right: "10%",
              height: 3,
              background: "#22c55e",
              transform: "translateY(-50%)",
              opacity: 0.8
            }} />
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
            {t("barcode.hint")}
          </div>
        </>
      )}

      <button
        className="btn btn-light"
        onClick={onClose}
        type="button"
        style={{ marginTop: 8 }}
      >
        {t("common.close")}
      </button>
    </div>
  );
}
