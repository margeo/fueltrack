import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";

export default function AuthScreen({ onSuccess, initialMode = "login" }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(initialMode); // login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(t("auth.loginError")); }
    else { onSuccess?.(); }
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error, data } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message?.includes("already") ? t("auth.emailExists") : t("auth.registerError"));
    } else if (data?.user?.identities?.length === 0) {
      setError(t("auth.emailExists"));
    } else {
      setMessage(t("auth.checkEmail"));
    }
    setLoading(false);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(t("auth.resetError"));
    } else {
      setMessage(t("auth.resetSent"));
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(t("auth.googleError"));
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🥗💪</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>FuelTrack</h1>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {t("auth.subtitle")}
          </div>
        </div>

        {/* Error / Message */}
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

        {/* Login Form */}
        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <div className="card" style={{ margin: 0 }}>
              <h2 style={{ marginBottom: 16 }}>{t("auth.login")}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="input" type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                <div style={{ position: "relative" }}>
                  <input className="input" type={showPassword ? "text" : "password"} placeholder={t("auth.password")} value={password}
                    onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, color: "var(--text-muted)" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <button className="btn btn-dark" type="submit" disabled={loading}
                  style={{ width: "100%", padding: "14px", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "..." : t("auth.loginBtn")}
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
                <span className="muted" style={{ fontSize: 12 }}>{t("auth.or")}</span>
                <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
              </div>

              <button type="button" onClick={handleGoogleLogin} disabled={loading}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                {t("auth.google")}
              </button>

              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
                  style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", fontSize: 13 }}>
                  {t("auth.forgotPassword")}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
              <span className="muted">{t("auth.noAccount")} </span>
              <button type="button" onClick={() => { setMode("register"); setError(""); setMessage(""); }}
                style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {t("auth.registerLink")}
              </button>
            </div>
          </form>
        )}

        {/* Register Form */}
        {mode === "register" && (
          <form onSubmit={handleRegister}>
            <div className="card" style={{ margin: 0 }}>
              <h2 style={{ marginBottom: 16 }}>{t("auth.register")}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="input" type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                <div style={{ position: "relative" }}>
                  <input className="input" type={showPassword ? "text" : "password"} placeholder={t("auth.password")} value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, color: "var(--text-muted)" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{t("auth.passwordHint")}</div>
                <button className="btn btn-dark" type="submit" disabled={loading}
                  style={{ width: "100%", padding: "14px", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "..." : t("auth.registerBtn")}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
              <span className="muted">{t("auth.hasAccount")} </span>
              <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {t("auth.loginLink")}
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword}>
            <div className="card" style={{ margin: 0 }}>
              <h2 style={{ marginBottom: 16 }}>{t("auth.resetPassword")}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="input" type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                <button className="btn btn-dark" type="submit" disabled={loading}
                  style={{ width: "100%", padding: "14px", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "..." : t("auth.resetBtn")}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
              <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {t("auth.backToLogin")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
