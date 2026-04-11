import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";
import { fetchUsage, getCachedUsage, setCachedUsage, computeLimitState } from "../utils/aiUsage";
import AiLimitLock from "./AiLimitLock";

export default function FoodPhotoAnalyzer({ onFoodFound, onClose, session, onShowAuth, onShowRegister }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [usage, setUsage] = useState(() => getCachedUsage(session?.user?.id));
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("ft_photo_model") || "");
  const fileRef = useRef(null);

  function applyServerUsage(serverUsage) {
    if (!serverUsage) return;
    setUsage(serverUsage);
    setCachedUsage(session?.user?.id, serverUsage);
  }

  useEffect(() => {
    function onUsageChange(e) {
      const detail = e?.detail;
      if (detail?.usage) setUsage(detail.usage);
      else setUsage(getCachedUsage(session?.user?.id));
    }
    window.addEventListener("ft-ai-usage-change", onUsageChange);
    return () => window.removeEventListener("ft-ai-usage-change", onUsageChange);
  }, [session]);

  useEffect(() => {
    setUsage(getCachedUsage(session?.user?.id));
    if (!session?.access_token || !session?.user?.id) return;
    let cancelled = false;

    // Authoritative read from Supabase
    fetchUsage(session.user.id).then((fresh) => { if (!cancelled && fresh) setUsage(fresh); }).catch(() => {});

    supabase
      .from("profiles")
      .select("is_paid, is_demo")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setIsPaid(data?.is_paid === true);
        setIsDemo(data?.is_demo === true);
      })
      .catch(() => {});
    fetch("/.netlify/functions/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: "list-users" }),
    }).then(res => { if (!cancelled) setIsAdmin(res.ok); }).catch(() => {});
    return () => { cancelled = true; };
  }, [session]);

  const needsAccount = !session;
  const limitState = computeLimitState({ usage, isPaid, isDemo, needsAccount });
  const { limitReached } = limitState;

  async function handleImage(file) {
    if (!file) return;
    if (limitReached) return;

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type || "image/jpeg",
          language: i18n.language,
          ...(selectedModel && { model: selectedModel })
        })
      });

      if (res.status === 429) {
        const limitData = await res.json().catch(() => ({}));
        if (limitData.usage) applyServerUsage(limitData.usage);
        setPreview(null);
        return;
      }

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      if (data.aiUsage) applyServerUsage(data.aiUsage);

      setResult(data);
    } catch {
      setError(t("photo.analyzeError"));
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
    if (confidence === "high") return `✅ ${t("photo.highConfidence")}`;
    if (confidence === "medium") return `⚡ ${t("photo.mediumConfidence")}`;
    return `⚠️ ${t("photo.lowConfidence")}`;
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            📸 {t("photo.title")}
          </div>
          {isAdmin && (
            <select value={selectedModel} onChange={(e) => { setSelectedModel(e.target.value); localStorage.setItem("ft_photo_model", e.target.value); }}
              style={{ fontSize: 10, padding: "2px 4px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-muted)", cursor: "pointer" }}>
              <option value="">Gemini 2.5 Flash Lite (default) — $0.10/$0.40</option>
              <option value="gemini-3.1">Gemini 3.1 Flash Lite (preview) — $0.10/$1.50</option>
              <option value="gemini-flash">Gemini 2.5 Flash — $0.30/$2.50</option>
              <option value="haiku">Claude Haiku 4.5 (Direct) — $1/$5</option>
              <option value="haiku-openrouter">Claude Haiku 4.5 (OpenRouter) — $1/$5</option>
              <option value="gpt4o-mini">GPT-4o Mini — $0.15/$0.60</option>
              <option value="opus">Claude Opus 4.5 — $15/$75</option>
            </select>
          )}
        </div>

        {limitReached && (
          <AiLimitLock
            needsAccount={limitState.limitReached && !session}
            paidLimitReached={limitState.paidLimitReached}
            lifetimeLimitReached={limitState.lifetimeLimitReached}
            monthlyLimitReached={limitState.monthlyLimitReached}
            isPaid={isPaid}
            onShowAuth={onShowAuth}
            onShowRegister={onShowRegister}
          />
        )}

        {/* Upload area */}
        {!limitReached && !preview && (
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
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("photo.selectPhoto")}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {t("photo.orCamera")}
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
                {t("photo.anotherPhoto")}
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {t("photo.analyzing")}
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
                <span className="muted">{t("photo.caloriesPer100g")} </span>
                <strong>{result.caloriesPer100g} kcal</strong>
              </div>
              <div>
                <span className="muted">{t("photo.proteinLabel")} </span>
                <strong>{result.proteinPer100g}g</strong>
              </div>
              <div>
                <span className="muted">{t("photo.carbsLabel")} </span>
                <strong>{result.carbsPer100g}g</strong>
              </div>
              <div>
                <span className="muted">{t("photo.fatLabel")} </span>
                <strong>{result.fatPer100g}g</strong>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <span className="muted">{t("photo.estimatedAmount")} </span>
                <strong>{result.estimatedGrams}g</strong>
              </div>
            </div>
            {isAdmin && result.usage && (
              <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right", marginTop: -4 }}>
                in:{result.usage.inputTokens} out:{result.usage.outputTokens} · {result.usage.costUsd ? (result.usage.costUsd * 100).toFixed(2) + "¢" : "—"}{result.usage.model ? ` · ${result.usage.model}` : ""}
              </div>
            )}
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
              {t("common.add")}
            </button>
          )}
          {!limitReached && !preview && !loading && (
            <button
              className="btn btn-dark"
              onClick={() => fileRef.current?.click()}
              type="button"
              style={{ flex: 1 }}
            >
              📷 {t("photo.selectPhotoBtn")}
            </button>
          )}
          <button
            className="btn btn-light"
            onClick={onClose}
            type="button"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
