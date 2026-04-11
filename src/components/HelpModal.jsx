import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const TAB_META = {
  profile: { icon: "👤", key: "profile" },
  summary: { icon: "📊", key: "summary" },
  food: { icon: "🍔", key: "food" },
  exercise: { icon: "💪", key: "exercise" }
};

export default function HelpModal({ activeTab, onClose }) {
  const { t } = useTranslation();
  const meta = TAB_META[activeTab] || TAB_META.summary;

  useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const howToList = t(`help.${meta.key}.howTo`, { returnObjects: true });
  const tipsList = t(`help.${meta.key}.tips`, { returnObjects: true });

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ position: "relative", background: "var(--bg-card)", color: "var(--text-primary)", borderRadius: 20, padding: "20px 18px", maxWidth: 460, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: "1px solid var(--border-color)" }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1, padding: 4 }}
        >
          ✕
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingRight: 28 }}>
          <div style={{ fontSize: 28 }}>{meta.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{t("help.title")}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{t(`tabs.${meta.key}`)}</div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--text-primary)" }}>📖 {t("help.howTo")}</div>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {Array.isArray(howToList) && howToList.map((item, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>{item}</li>
            ))}
          </ul>
        </div>

        <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-soft)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>💡 {t("help.tips")}</div>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {Array.isArray(tipsList) && tipsList.map((item, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
