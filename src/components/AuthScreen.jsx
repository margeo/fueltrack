import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabaseClient";

export default function AuthScreen({ onSuccess, initialMode = "login" }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(initialMode); // login | register | forgot
  const [name, setName] = useState("");
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
    const { error, data } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name.trim() } }
    });
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


  return (
    <div style={{ minHeight: onSuccess ? "auto" : "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: onSuccess ? 16 : 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🥗💪</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>FuelTrack</h1>
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
