// Account deletion confirmation modal.
//
// Required by Apple App Store Guideline 5.1.1(v) — users must be able
// to delete their account from within the app. The user has to type
// DELETE (case-insensitive) to arm the confirm button, so a misclick
// can't wipe the account.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authedFetch } from "../utils/authFetch";
import { supabase } from "../supabaseClient";

const CONFIRM_WORD = "DELETE";

export default function DeleteAccountModal({ onClose }) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canConfirm = typed.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDelete() {
    if (!canConfirm || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await authedFetch("/.netlify/functions/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError(t("deleteAccount.error"));
        setLoading(false);
        return;
      }
      // Server deleted the auth row; now drop the local session so
      // App.jsx onAuthStateChange returns the user to the login screen.
      await supabase.auth.signOut();
      onClose?.();
    } catch {
      setError(t("deleteAccount.error"));
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose?.();
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 400,
          boxShadow: "var(--shadow-modal)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "var(--bg-soft)",
            border: "1px solid var(--border-color)",
            borderRadius: "50%",
            width: 28,
            height: 28,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: loading ? 0.5 : 1,
          }}
        >
          ✕
        </button>

        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 4 }}>⚠️</div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            textAlign: "center",
            color: "#dc2626",
          }}
        >
          {t("deleteAccount.title")}
        </h2>
        <p
          className="muted"
          style={{ fontSize: 13, textAlign: "center", margin: "0 0 14px" }}
        >
          {t("deleteAccount.warning")}
        </p>

        <ul
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            paddingLeft: 20,
            margin: "0 0 16px",
          }}
        >
          <li style={{ marginBottom: 4 }}>{t("deleteAccount.item1")}</li>
          <li style={{ marginBottom: 4 }}>{t("deleteAccount.item2")}</li>
          <li style={{ marginBottom: 4 }}>{t("deleteAccount.item3")}</li>
        </ul>

        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {t("deleteAccount.typePrompt", { word: CONFIRM_WORD })}
        </label>
        <input
          className="input"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={CONFIRM_WORD}
          disabled={loading}
          autoFocus
          autoComplete="off"
          style={{
            marginBottom: 12,
            fontFamily: "monospace",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        />

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 12,
              color: "#b91c1c",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-light"
            style={{ flex: 1, padding: "10px 0", fontSize: 14 }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canConfirm || loading}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 700,
              background: canConfirm ? "#dc2626" : "var(--bg-soft)",
              color: canConfirm ? "white" : "var(--text-muted)",
              border: "none",
              borderRadius: 10,
              cursor: canConfirm && !loading ? "pointer" : "not-allowed",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? t("common.loading") : t("deleteAccount.confirmBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
