import { useRef, useState } from "react";

export default function FoodPhotoAnalyzer({ onFoodFound, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  async function handleImage(file) {
    if (!file) return;

    setError("");
    setResult(null);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Convert to base64
    const base64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

    setLoading(true);

    try {
      const res = await fetch("/.netlify/functions/food-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type || "image/jpeg"
        })
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err) {
      setError("Δεν ήταν δυνατή η ανάλυση. Δοκίμασε ξανά.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) handleImage(file);
  }

  function handleConfirm() {
    if (!result) return;
    onFoodFound({
      id: `photo-${Date.now()}`,
      source: "local",
      sourceLabel: "📸 Photo",
      name: result.name,
      brand: "",
      caloriesPer100g: Number(result.caloriesPer100g || 0),
      proteinPer100g: Number(result.proteinPer100g || 0),
      carbsPer100g: Number(result.carbsPer100g || 0),
      fatPer100g: Number(result.fatPer100g || 0),
      estimatedGrams: Number(result.estimatedGrams || 100)
    });
  }

  function getConfidenceColor(confidence) {
    if (confidence === "high") return "#166534";
    if (confidence === "medium") return "#92400e";
    return "#b91c1c";
  }

  function getConfidenceLabel(confidence) {
    if (confidence === "high") return "✅ Υψηλή βεβαιότητα";
    if (confidence === "medium") return "⚡ Μέτρια βεβαιότητα";
    return "⚠️ Χαμηλή βεβαιότητα — έλεγξε τις τιμές";
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 20,
          padding: 20,
          width: "100%",
          maxWidth: 400,
          boxShadow: "var(--shadow-modal)",
          maxHeight: "90vh",
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          📸 Ανάλυση φαγητού
        </div>

        {/* Upload area */}
        {!preview && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed var(--border-color)",
              borderRadius: 14,
              padding: 30,
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 12
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Επέλεξε φωτογραφία</div>
            <div className="muted" style={{ fontSize: 13 }}>
              ή τράβηξε από την κάμερα
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Preview */}
        {preview && (
          <div style={{ marginBottom: 12 }}>
            <img
              src={preview}
              alt="preview"
              style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }}
            />
            {!loading && (
              <button
                className="btn btn-light"
                onClick={() => { setPreview(null); setResult(null); }}
                type="button"
                style={{ marginTop: 8, width: "100%", fontSize: 13 }}
              >
                Άλλη φωτογραφία
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Αναλύω το φαγητό...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {result.name}
            </div>
            {result.description && (
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                {result.description}
              </div>
            )}

            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: getConfidenceColor(result.confidence),
              marginBottom: 10
            }}>
              {getConfidenceLabel(result.confidence)}
            </div>

            <div style={{
              background: "var(--bg-soft)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              fontSize: 13
            }}>
              <div>
                <span className="muted">Θερμίδες/100g: </span>
                <strong>{result.caloriesPer100g} kcal</strong>
              </div>
              <div>
                <span className="muted">Πρωτεΐνη: </span>
                <strong>{result.proteinPer100g}g</strong>
              </div>
              <div>
                <span className="muted">Υδατ.: </span>
                <strong>{result.carbsPer100g}g</strong>
              </div>
              <div>
                <span className="muted">Λίπος: </span>
                <strong>{result.fatPer100g}g</strong>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <span className="muted">Εκτιμ. ποσότητα: </span>
                <strong>{result.estimatedGrams}g</strong>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {result && !loading && (
            <button
              className="btn btn-dark"
              onClick={handleConfirm}
              type="button"
              style={{ flex: 1 }}
            >
              Προσθήκη
            </button>
          )}
          {!preview && !loading && (
            <button
              className="btn btn-dark"
              onClick={() => fileRef.current?.click()}
              type="button"
              style={{ flex: 1 }}
            >
              📷 Επέλεξε φωτογραφία
            </button>
          )}
          <button
            className="btn btn-light"
            onClick={onClose}
            type="button"
          >
            Άκυρο
          </button>
        </div>
      </div>
    </div>
  );
}