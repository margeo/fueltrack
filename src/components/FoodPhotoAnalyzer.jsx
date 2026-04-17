import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "../supabaseClient";
import { fetchUsage, getCachedUsage, setCachedUsage, computeLimitState } from "../utils/aiUsage";
import { authedFetch } from "../utils/authFetch";
import { hasNativePlugin } from "../utils/nativeCapabilities";
import AiLimitLock from "./AiLimitLock";
import AiUsageBadge from "./AiUsageBadge";

// When we run inside a Capacitor native shell we prefer the native
// camera/photos picker — it opens the platform camera UI, handles
// permission prompts natively, and returns a ready-to-upload image.
// The existing web flow (getUserMedia + file input) stays in place
// and is still used when the app runs as a PWA in a browser.
//
// IS_NATIVE_SHELL tells us "running inside the Android/iOS app".
// HAS_NATIVE_CAMERA tells us "the installed APK has the Camera
// plugin compiled in". The second is stricter: a stale APK built
// before Phase A3 returns true for IS_NATIVE_SHELL but false for
// HAS_NATIVE_CAMERA, and in that case we must NOT fall back to
// getUserMedia because @capacitor/core would route the call to
// its web impl (getUserMedia inside the Android WebView fails
// with a generic "could not access the camera" message that is
// extremely confusing to debug). Instead we surface a clear
// "please update the app" error to the user.
const IS_NATIVE_SHELL = Capacitor.isNativePlatform();
const HAS_NATIVE_CAMERA = hasNativePlugin("Camera");

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
  const [cameraOn, setCameraOn] = useState(false);
  const [limitDismissed, setLimitDismissed] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [videoDevices, setVideoDevices] = useState([]);
  // Track the intended facing mode, NOT the deviceId. On iOS Safari
  // getSettings().deviceId is often empty or unstable across getUserMedia
  // calls, which made deviceId-based cycling get stuck on the same camera
  // for 1-2 taps before finally flipping. facingMode is the stable primitive.
  const [currentFacing, setCurrentFacing] = useState("environment");
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
    authedFetch("/.netlify/functions/check-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(res => res.json()).then(data => { if (!cancelled) setIsAdmin(data?.isAdmin === true); }).catch(() => {});
    return () => { cancelled = true; };
  }, [session]);

  const needsAccount = !session;
  const limitState = computeLimitState({ usage, isPaid, isDemo, isAdmin, needsAccount });
  const { limitReached } = limitState;

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(tr => tr.stop());
      streamRef.current = null;
    }
  }

  async function openStreamForFacing(facing) {
    // Stop any existing stream first
    stopStream();
    const constraints = {
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    // Ensure the video element picks up the new stream immediately
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    return stream;
  }

  async function startCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("photo.cameraNotSupported"));
      return;
    }
    try {
      // Open back camera first; this also triggers the permission
      // prompt (enumerateDevices returns labels only after permission).
      await openStreamForFacing("environment");
      setCurrentFacing("environment");

      // Enumerate just so we can decide whether to show the switch
      // button — if the device only has one camera we hide it.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === "videoinput");
        setVideoDevices(cams);
      } catch { /* ignore enumeration failures */ }

      setCameraOn(true);
    } catch (err) {
      setCameraError(err?.name === "NotAllowedError" ? t("photo.cameraDenied") : t("photo.cameraError"));
    }
  }

  async function switchCamera() {
    if (videoDevices.length < 2) return;
    const next = currentFacing === "environment" ? "user" : "environment";
    try {
      await openStreamForFacing(next);
      setCurrentFacing(next);
    } catch {
      setCameraError(t("photo.cameraError"));
    }
  }

  // Callback ref — attaches the stream at the exact moment the <video>
  // element mounts, avoiding any race with useEffect timing.
  function attachVideo(el) {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }

  function stopCamera() {
    stopStream();
    setCameraOn(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return;
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    stopCamera();
    handleImage(file);
  }

  // Capacitor native camera/gallery picker. Opens the platform
  // camera UI (or photo picker) and returns a File ready for the
  // existing handleImage pipeline. Only called when HAS_NATIVE_CAMERA
  // is true — callers must gate on that, otherwise we would end up
  // exercising @capacitor/camera's web fallback inside the Android
  // WebView (see comment at the top of this file).
  async function pickPhotoNative(source) {
    setCameraError("");
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.Base64,
        source,
        allowEditing: false,
        correctOrientation: true,
        saveToGallery: false,
        width: 1280,
      });
      if (!photo?.base64String) return;
      const format = (photo.format || "jpeg").toLowerCase();
      const mime = format === "png" ? "image/png" : "image/jpeg";
      // base64 → Uint8Array → Blob → File (so handleImage's existing
      // FileReader/FormData paths keep working unchanged)
      const binary = atob(photo.base64String);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const file = new File([blob], `camera-${Date.now()}.${format === "png" ? "png" : "jpg"}`, { type: mime });
      handleImage(file);
    } catch (err) {
      // Capacitor throws on user-cancel with message "User cancelled
      // photos app" or similar — treat those as silent dismissals.
      const msg = String(err?.message || err || "").toLowerCase();
      if (msg.includes("cancel")) return;
      if (msg.includes("denied") || msg.includes("permission")) {
        setCameraError(t("photo.cameraDenied"));
        return;
      }
      setCameraError(t("photo.cameraError"));
    }
  }

  // Stop camera on unmount
  useEffect(() => {
    return () => { stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const res = await authedFetch("/.netlify/functions/food-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>📸 {t("photo.title")}</span>
            <AiUsageBadge session={session} isPaid={isPaid} isDemo={isDemo} isAdmin={isAdmin} />
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

        {limitReached && !limitDismissed && (
          <AiLimitLock
            needsAccount={limitState.limitReached && !session}
            paidLimitReached={limitState.paidLimitReached}
            lifetimeLimitReached={limitState.lifetimeLimitReached}
            monthlyLimitReached={limitState.monthlyLimitReached}
            isPaid={isPaid}
            onShowAuth={onShowAuth}
            onShowRegister={onShowRegister}
            onDismiss={() => setLimitDismissed(true)}
          />
        )}

        {/* Camera live preview */}
        {!limitReached && cameraOn && (
          <div style={{ marginBottom: 12 }}>
            <video
              ref={attachVideo}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", borderRadius: 12, background: "#000", maxHeight: 260, objectFit: "cover" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-dark" onClick={capturePhoto} type="button" style={{ flex: 1 }}>
                📸 {t("photo.capture")}
              </button>
              {videoDevices.length > 1 && (
                <button className="btn btn-light" onClick={switchCamera} type="button" title={t("photo.switchCamera")}>
                  🔄
                </button>
              )}
              <button className="btn btn-light" onClick={stopCamera} type="button">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Upload area */}
        {!limitReached && !cameraOn && !preview && (
          <>
            <div
              onClick={() => {
                if (HAS_NATIVE_CAMERA) pickPhotoNative(CameraSource.Photos);
                else if (IS_NATIVE_SHELL) setCameraError(t("photo.updateRequired"));
                else fileRef.current?.click();
              }}
              style={{
                border: "2px dashed var(--border-color)",
                borderRadius: 14,
                padding: 30,
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 8
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("photo.selectPhoto")}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {t("photo.orCamera")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (HAS_NATIVE_CAMERA) pickPhotoNative(CameraSource.Camera);
                else if (IS_NATIVE_SHELL) setCameraError(t("photo.updateRequired"));
                else startCamera();
              }}
              className="btn btn-light"
              style={{ width: "100%", marginBottom: 12, fontSize: 13 }}
            >
              📹 {t("photo.openCamera")}
            </button>
            {cameraError && (
              <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 8, textAlign: "center" }}>
                {cameraError}
              </div>
            )}
          </>
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
          {!limitReached && !preview && !loading && !cameraOn && (
            <button
              className="btn btn-dark"
              onClick={() => {
                if (HAS_NATIVE_CAMERA) pickPhotoNative(CameraSource.Photos);
                else if (IS_NATIVE_SHELL) setCameraError(t("photo.updateRequired"));
                else fileRef.current?.click();
              }}
              type="button"
              style={{ flex: 1 }}
            >
              📷 {t("photo.selectPhotoBtn")}
            </button>
          )}
          <button
            className="btn btn-dark"
            onClick={onClose}
            type="button"
            style={{ flex: 1 }}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
