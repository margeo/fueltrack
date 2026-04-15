import { useState } from "react";
import { useTranslation } from "react-i18next";
import { startProMonthlyPurchase } from "../utils/subscription";
import { AI_LIMITS } from "../utils/aiUsage";

// Shown once after first login. User picks Free or Pro.
// Dismissal is persisted in localStorage so it only shows once.
export default function PlanChooser({ onContinue }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 20, padding: 28,
        width: "100%", maxWidth: 380, boxShadow: "var(--shadow-modal)",
        textAlign: "center"
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{t("planChooser.title")}</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>{t("planChooser.subtitle")}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Pro */}
          <button
            className="btn btn-dark"
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try { await startProMonthlyPurchase(); } catch { /* ignore */ }
              finally { setLoading(false); }
              localStorage.setItem("ft_plan_chosen", "1");
              onContinue();
            }}
            style={{ padding: "14px 20px", fontSize: 15, borderRadius: 14 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span>⭐</span>
              <span>{loading ? t("common.loading") : t("planChooser.proCta")}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>
              {t("aiCoach.subscribePrice")}
            </div>
          </button>

          {/* Free */}
          <button
            className="btn btn-light"
            type="button"
            onClick={() => {
              localStorage.setItem("ft_plan_chosen", "1");
              onContinue();
            }}
            style={{ padding: "14px 20px", fontSize: 15, borderRadius: 14 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span>🆓</span>
              <span>{t("planChooser.freeCta")}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
