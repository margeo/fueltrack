import { useTranslation } from "react-i18next";

export default function BottomNav({ tabs, activeTab, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={activeTab === tab.key ? "active" : ""}
          onClick={() => onChange(tab.key)}
        >
          <div className="nav-icon">{tab.icon}</div>
          <div>{t(tab.labelKey)}</div>
        </button>
      ))}
    </div>
  );
}
