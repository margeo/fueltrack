import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";

export default function VerifyEmailScreen({ email }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    setMessage("");
    setError("");
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    if (resendError) {
      setError(t("verifyEmail.resendError"));
    } else {
      setMessage(t("verifyEmail.resendSuccess"));
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setLoading(true);
    const { data } = await supabase.auth.refreshSession();
    setLoading(false);
    if (!data?.session?.user?.email_confirmed_at) {
      setError(t("verifyEmail.notYetError"));
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>📬</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t("verifyEmail.title")}</h1>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
            {t("verifyEmail.intro")}
          </div>
          {email && (
            <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, textAlign: "center", wordBreak: "break-all" }}>
              {email}
            </div>
          )}
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
            {t("verifyEmail.spamHint")}
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#b91c1c", fontSize: 13 }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#166534", fontSize: 13 }}>
              {message}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-dark" type="button" onClick={handleRefresh} disabled={loading}
              style={{ width: "100%", padding: "12px", opacity: loading ? 0.6 : 1 }}>
              {loading ? "..." : t("verifyEmail.iVerified")}
            </button>
            <button className="btn btn-light" type="button" onClick={handleResend} disabled={loading || !email}
              style={{ width: "100%", padding: "12px", opacity: loading ? 0.6 : 1 }}>
              {t("verifyEmail.resend")}
            </button>
            <button type="button" onClick={handleLogout}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, marginTop: 4, textDecoration: "underline" }}>
              {t("verifyEmail.logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
