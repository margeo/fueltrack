export default function BottomNav({ tabs, activeTab, onChange }) {
  return (
    <div className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={activeTab === tab.key ? "active" : ""}
          onClick={() => onChange(tab.key)}
        >
          <div className="nav-icon">{tab.icon}</div>
          <div>{tab.label}</div>
        </button>
      ))}
    </div>
  );
}