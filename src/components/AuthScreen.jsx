import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";
import { apiUrl } from "../utils/apiBase";

export default function AuthScreen({ onSuccess, initialMode = "login", isModal = false, prefilledEmail = "", postConfirmMessage = "" }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(initialMode); // login | register | forgot
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(postConfirmMessage || "");

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
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    const { error, data } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/?post_confirm=signup`
      }
    });
    if (error) {
      setError(error.message?.includes("already") ? t("auth.emailExists") : t("auth.registerError"));
    } else if (data?.user?.identities?.length === 0) {
      setError(t("auth.emailExists"));
    } else {
      setMessage(t("auth.checkEmail"));
      // Notify admin of new signup (fire and forget)
      fetch(apiUrl("/.netlify/functions/new-user-notify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email })
      }).catch(() => {});
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


  return (
    <div style={{ minHeight: isModal ? "auto" : "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: isModal ? 0 : 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        {!isModal && (
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🥗💪</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>FuelTrack</h1>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {t("auth.subtitle")}
            </div>
          </div>
        )}

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
            <div className="card" style={{ margin: 0, position: "relative" }}>
              {isModal && (
                <button type="button" onClick={onSuccess}
                  style={{ position: "absolute", top: 10, right: 10, background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✕
                </button>
              )}
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

              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); setConfirmPassword(""); }}
                  style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", fontSize: 13 }}>
                  {t("auth.forgotPassword")}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
              <span className="muted">{t("auth.noAccount")} </span>
              <button type="button" onClick={() => { setMode("register"); setError(""); setMessage(""); setConfirmPassword(""); }}
                style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {t("auth.registerLink")}
              </button>
            </div>
          </form>
        )}

        {/* Register Form */}
        {mode === "register" && (
          <form onSubmit={handleRegister}>
            <div className="card" style={{ margin: 0, position: "relative" }}>
              {isModal && (
                <button type="button" onClick={onSuccess}
                  style={{ position: "absolute", top: 10, right: 10, background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✕
                </button>
              )}
              <h2 style={{ marginBottom: 16 }}>{t("auth.register")}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="input" type="text" placeholder={t("auth.name")} value={name}
                  onChange={(e) => setName(e.target.value)} required autoComplete="name" />
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
                <input className="input" type={showPassword ? "text" : "password"} placeholder={t("auth.confirmPassword")} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                <div className="muted" style={{ fontSize: 12 }}>{t("auth.passwordHint")}</div>
                <button className="btn btn-dark" type="submit" disabled={loading}
                  style={{ width: "100%", padding: "14px", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "..." : t("auth.registerBtn")}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
              <span className="muted">{t("auth.hasAccount")} </span>
              <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); setConfirmPassword(""); }}
                style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {t("auth.loginLink")}
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword}>
            <div className="card" style={{ margin: 0, position: "relative" }}>
              {isModal && (
                <button type="button" onClick={onSuccess}
                  style={{ position: "absolute", top: 10, right: 10, background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✕
                </button>
              )}
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
              <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); setConfirmPassword(""); }}
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
