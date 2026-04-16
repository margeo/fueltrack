import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const TAB_META = {
  profile: { icon: "👤", key: "profile" },
  summary: { icon: "📊", key: "summary" },
  food: { icon: "🍔", key: "food" },
  exercise: { icon: "💪", key: "exercise" }
};

function renderInlineBold(text) {
  if (typeof text !== "string") return text;
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
}

function SubItem({ item }) {
  if (typeof item === "string") {
    return <li style={{ marginBottom: 3 }}>{renderInlineBold(item)}</li>;
  }
  return (
    <li style={{ marginBottom: 3 }}>
      <span>{renderInlineBold(item.text)}</span>
      {Array.isArray(item.sub) && item.sub.length > 0 && (
        <ul style={{ margin: "3px 0 0", paddingLeft: 18 }}>
          {item.sub.map((s, i) => <SubItem key={i} item={s} />)}
        </ul>
      )}
    </li>
  );
}

function ItemBlock({ item }) {
  // Simple bullet (used in "Τι μπορείς να κάνεις" / "💡 Tips" / nested-only sections)
  if (item.li !== undefined) {
    return (
      <li style={{ marginBottom: 6 }}>
        {renderInlineBold(item.li)}
        {Array.isArray(item.sub) && item.sub.length > 0 && (
          <ul style={{ margin: "3px 0 0", paddingLeft: 18 }}>
            {item.sub.map((s, i) => <SubItem key={i} item={s} />)}
          </ul>
        )}
      </li>
    );
  }
  // Top-level bullet with bold title + optional body/note/sub/footer
  return (
    <li style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 700 }}>{renderInlineBold(item.title)}</div>
      {item.body && (
        <div style={{ marginTop: 2, whiteSpace: "pre-line" }}>{renderInlineBold(item.body)}</div>
      )}
      {item.note && (
        <div style={{ marginTop: 2, color: "var(--text-muted)", fontSize: 12 }}>{item.note}</div>
      )}
      {Array.isArray(item.sub) && item.sub.length > 0 && (
        <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
          {item.sub.map((s, i) => <SubItem key={i} item={s} />)}
        </ul>
      )}
      {item.footer && <div style={{ marginTop: 4 }}>{renderInlineBold(item.footer)}</div>}
    </li>
  );
}

export default function HelpModal({ activeTab, onClose }) {
  const { t } = useTranslation();
  const meta = TAB_META[activeTab] || TAB_META.summary;

  useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const sections = t(`help.${meta.key}.sections`, { returnObjects: true });
  const sectionList = Array.isArray(sections) ? sections : [];

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

        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>
          {sectionList.map((section, si) => (
            <div
              key={si}
              style={{
                borderTop: si > 0 ? "1px solid var(--border-soft)" : "none",
                paddingTop: si > 0 ? 14 : 0,
                marginTop: si > 0 ? 14 : 0,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)" }}>
                {section.heading}
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(section.items || []).map((item, i) => <ItemBlock key={i} item={item} />)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
