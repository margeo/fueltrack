import { useTranslation } from "react-i18next";

export default function WelcomeScreen({ onStart }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding: "8px 0" }}>
      {/* HERO */}
      <div className="hero-card" style={{ marginBottom: 16, textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🥗💪</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "white", marginBottom: 8, lineHeight: 1.2 }}>
          {t("welcome.hero")}
        </div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6 }}>
          {t("welcome.heroSub")}
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🎯</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("welcome.goalFirst")}</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              {t("welcome.goalFirstDesc")}
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("welcome.aiCoach")}</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              {t("welcome.aiCoachDesc")}
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🇬🇷</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("welcome.greekFoods")}</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              {t("welcome.greekFoodsDesc")}
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("welcome.fast")}</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              {t("welcome.fastDesc")}
            </div>
          </div>
        </div>
      </div>

      {/* FORMULA */}
      <div className="card" style={{ margin: "0 0 16px", background: "var(--bg-soft)", textAlign: "center" }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{t("welcome.formula")}</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          {t("welcome.formulaText")}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          {t("welcome.formulaHint")}
        </div>
      </div>

      <button className="btn btn-dark" onClick={onStart} style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 800, borderRadius: 16 }}>
        {t("welcome.start")}
      </button>

      <div className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>
        {t("welcome.duration")}
      </div>
    </div>
  );
}
