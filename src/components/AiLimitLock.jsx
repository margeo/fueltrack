import { useTranslation } from "react-i18next";
import { AI_LIMITS } from "../utils/aiUsage";

export default function AiLimitLock({
  needsAccount,
  paidLimitReached,
  lifetimeLimitReached,
  monthlyLimitReached,
  isPaid,
  onShowAuth,
  onShowRegister
}) {
  const { t } = useTranslation();

  const icon = needsAccount ? "🔒" : paidLimitReached ? "📊" : lifetimeLimitReached ? "🚀" : "⏳";
  const title = needsAccount
    ? t("aiCoach.needsAccountTitle")
    : paidLimitReached
    ? t("aiCoach.paidLimitTitle")
    : lifetimeLimitReached
    ? t("aiCoach.lifetimeLimitTitle")
    : t("aiCoach.limitTitle");
  const desc = needsAccount
    ? t("aiCoach.needsAccountDesc")
    : paidLimitReached
    ? t("aiCoach.paidLimitDesc", { limit: AI_LIMITS.MONTHLY_PAID })
    : lifetimeLimitReached
    ? t("aiCoach.lifetimeLimitDesc", { limit: AI_LIMITS.LIFETIME_FREE })
    : monthlyLimitReached
    ? t("aiCoach.monthlyLimitDesc", { limit: AI_LIMITS.MONTHLY_FREE })
    : t("aiCoach.limitDesc", { limit: AI_LIMITS.DAILY_FREE });

  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{desc}</div>

      {paidLimitReached && (
        <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, margin: "16px 0" }}>
          {t("aiCoach.paidLimitExtra")}
        </div>
      )}
      {!needsAccount && !isPaid && (lifetimeLimitReached || monthlyLimitReached) && (
        <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, margin: "16px 0" }}>
          {t("aiCoach.upgradeHint")}
        </div>
      )}
      {needsAccount && onShowAuth && (
        <div>
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "12px 16px", textAlign: "left", fontSize: 13, lineHeight: 1.8, margin: "16px 0" }}>
            <div>✅ {t("aiCoach.proFeature1")}</div>
            <div>✅ {t("aiCoach.proFeature2")}</div>
            <div>✅ {t("aiCoach.proFeature3")}</div>
            <div>✅ {t("aiCoach.proFeature4")}</div>
          </div>
          <div className="muted" style={{ fontSize: 11, marginBottom: 14 }}>{t("aiCoach.freeNote")}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-dark" onClick={onShowAuth} type="button" style={{ padding: "12px 24px", fontSize: 14 }}>
              {t("auth.loginBtn")}
            </button>
            {onShowRegister && (
              <button className="btn btn-light" onClick={onShowRegister} type="button" style={{ padding: "12px 24px", fontSize: 14 }}>
                {t("auth.registerBtn")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
