import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        reader.reset();
        onResult(result.getText());
      }
    }).catch(() => {
      setError("Δεν επιτράπηκε η πρόσβαση στην κάμερα.");
    });

    return () => {
      reader.reset();
    };
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