import { useEffect, useRef, useState } from "react";

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let stream = null;
    let detector = null;
    let animFrame = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!("BarcodeDetector" in window)) {
          setError("Ο browser σου δεν υποστηρίζει barcode scanning. Δοκίμασε Chrome.");
          return;
        }

        detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]
        });

        async function detect() {
          if (!scanning) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrame = requestAnimationFrame(detect);
            return;
          }

          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              stopCamera();
              onResult(code);
              return;
            }
          } catch {
            // continue scanning
          }

          animFrame = requestAnimationFrame(detect);
        }

        detect();
      } catch (err) {
        setError("Δεν επιτράπηκε η πρόσβαση στην κάμερα.");
      }
    }

    function stopCamera() {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    }

    startCamera();

    return () => stopCamera();
  }, []);

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
        📷 Σκανάρισμα Barcode
      </div>

      {error ? (
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
            Στόχευσε το barcode του προϊόντος
          </div>
        </>
      )}

      <button
        className="btn btn-light"
        onClick={onClose}
        type="button"
        style={{ marginTop: 8 }}
      >
        Κλείσιμο
      </button>
    </div>
  );
}