// src/components/tabs/SummaryTab.jsx
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDisplayDate, formatNumber, getTodayKey } from "../../utils/helpers";
import { calculateStreak, getStreakEmoji } from "../../utils/streak";
import { apiUrl } from "../../utils/apiBase";
import { authedFetch } from "../../utils/authFetch";
import AiCoach from "../AiCoach";
import DatePickerModal from "../DatePickerModal";

function exportToPDF(plan) {
  const lang = localStorage.getItem("ft_language") || (navigator.language?.startsWith("el") ? "el" : "en");
  const isEn = lang === "en";
  const title = plan.type === "meal"
    ? (isEn ? "Weekly Meal Plan" : "Εβδομαδιαίο Πρόγραμμα Διατροφής")
    : (isEn ? "Weekly Training Plan" : "Εβδομαδιαίο Πρόγραμμα Γυμναστικής");
  const emoji = plan.type === "meal" ? "🥗" : "💪";
  const lines = plan.content.split("\n").map(line => {
    const escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (line.startsWith("📅")) return `<div class="day-header">${escaped}</div>`;
    if (line.startsWith("Σύνολο") || line.startsWith("Total")) return `<div class="total">${escaped}</div>`;
    if (line.startsWith("─")) return `<hr>`;
    if (line.startsWith("⚠️")) return `<div class="disclaimer">${escaped}</div>`;
    if (line.trim() === "") return `<div style="height:6px"></div>`;
    return `<div class="line">${escaped}</div>`;
  }).join("");
  const createdLabel = isEn ? "Created" : "Δημιουργήθηκε";
  const saveLabel = isEn ? "💾 Save" : "💾 Αποθήκευση";
  const printLabel = isEn ? "🖨️ Print" : "🖨️ Εκτύπωση";
  const closeLabel = isEn ? "✕ Close" : "✕ Κλείσιμο";
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px;color:#111;line-height:1.65;font-size:14px}.top-bar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #111;padding-bottom:14px}.title-block .main-title{font-size:20px;font-weight:bold}.title-block .sub{color:#555;font-size:13px;margin-top:4px}.btn-group{display:flex;gap:10px;flex-shrink:0}.btn{padding:12px 20px;border-radius:10px;font-size:15px;cursor:pointer;border:none;font-weight:bold;white-space:nowrap}.btn-save{background:#166534;color:white}.btn-print{background:#111;color:white}.btn-close{background:#e5e7eb;color:#111}.day-header{font-weight:bold;font-size:15px;margin-top:16px;margin-bottom:6px;background:#f3f4f6;padding:8px 12px;border-radius:6px;border-left:4px solid #111}.line{padding:3px 12px}.total{font-weight:bold;padding:5px 12px;background:#f9fafb;border-radius:4px}.disclaimer{background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:12px;color:#78350f}hr{border:none;border-top:1px solid #e5e7eb;margin:8px 0}@media print{.btn-group{display:none}body{padding:16px}}</style></head><body><div class="top-bar"><div class="title-block"><div class="main-title">${emoji} FuelTrack — ${title}</div><div class="sub">${createdLabel}: ${plan.date}</div></div><div class="btn-group"><button class="btn btn-save" onclick="window.print()">${saveLabel}</button><button class="btn btn-print" onclick="window.print()">${printLabel}</button><button class="btn btn-close" onclick="window.close()">${closeLabel}</button></div></div>${lines}</body></html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

function exportGroceryToPDF(groceryData) {
  const lang = localStorage.getItem("ft_language") || (navigator.language?.startsWith("el") ? "el" : "en");
  const isEn = lang === "en";
  const lines = (groceryData?.categories || []).map(cat => {
    const header = `<div class="category">${cat.emoji} ${cat.name}</div>`;
    const items = cat.items.map(i => `<div class="item">${i.name}: ${i.quantity}</div>`).join("");
    return header + items;
  }).join("");
  const title = isEn ? "Grocery List" : "Λίστα Σούπερ Μάρκετ";
  const printedLabel = isEn ? "Printed" : "Εκτυπώθηκε";
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px;color:#111;line-height:1.65;font-size:14px}.top-bar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #111;padding-bottom:14px}.main-title{font-size:20px;font-weight:bold}.sub{color:#555;font-size:13px;margin-top:4px}.btn-group{display:flex;gap:10px}.btn{padding:12px 20px;border-radius:10px;font-size:15px;cursor:pointer;border:none;font-weight:bold;white-space:nowrap}.btn-save{background:#166534;color:white}.btn-print{background:#111;color:white}.btn-close{background:#e5e7eb;color:#111}.category{font-weight:bold;font-size:15px;margin-top:16px;margin-bottom:6px;background:#f3f4f6;padding:8px 12px;border-radius:6px}.item{padding:4px 16px}.line{padding:3px 0}@media print{.btn-group{display:none}body{padding:16px}}</style></head><body><div class="top-bar"><div><div class="main-title">🛒 ${title} — FuelTrack</div><div class="sub">${printedLabel}: ${new Date().toLocaleDateString(isEn ? "en-US" : "el-GR")}</div></div><div class="btn-group"><button class="btn btn-save" onclick="window.print()">${isEn ? "💾 Save" : "💾 Αποθήκευση"}</button><button class="btn btn-print" onclick="window.print()">${isEn ? "🖨️ Print" : "🖨️ Εκτύπωση"}</button><button class="btn btn-close" onclick="window.close()">${isEn ? "✕ Close" : "✕ Κλείσιμο"}</button></div></div>${lines}</body></html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

const GROCERY_ITEM_SCHEMA = {
  type: "object",
  properties: { name: { type: "string" }, quantity: { type: "string" } },
  required: ["name", "quantity"],
  additionalProperties: false
};
const GROCERY_CATEGORY_SCHEMA = {
  type: "object",
  properties: {
    emoji: { type: "string" },
    name: { type: "string" },
    items: { type: "array", items: GROCERY_ITEM_SCHEMA }
  },
  required: ["emoji", "name", "items"],
  additionalProperties: false
};
const GROCERY_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "grocery_list",
    strict: true,
    schema: {
      type: "object",
      properties: {
        categories: { type: "array", items: GROCERY_CATEGORY_SCHEMA }
      },
      required: ["categories"],
      additionalProperties: false
    }
  }
};

function GroceryListView({ data }) {
  if (!data?.categories?.length) return null;
  return (
    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
      {data.categories.map((cat, ci) => (
        <div key={ci}>
          <div style={{ fontWeight: 700, fontSize: 13, marginTop: ci > 0 ? 12 : 0, marginBottom: 4, paddingBottom: 3, borderBottom: "1px solid var(--border-soft)" }}>
            {cat.emoji} {cat.name}
          </div>
          {cat.items.map((item, ii) => (
            <div key={ii} style={{ padding: "2px 0 2px 8px" }}>{item.name}: {item.quantity}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function SummaryTab({
  selectedDate, setSelectedDate, isToday,
  targetCalories, totalCalories, exerciseValue,
  remainingCalories, progress, goalType,
  last7Days, proteinTarget, totalProtein,
  totalCarbs, totalFat, mode, macroTargets,
  foods, dailyLogs, weightLog,
  onAddWeight, onDeleteWeight,
  favoriteFoods,
  favoriteExercises, age, weight, height, gender,
  savedPlans, onSavePlan, onDeletePlan, session, userName, onShowAuth, onShowRegister,
  foodCategories, allergies, cookingLevel, cookingTime, simpleMode,
  mealsPerDay, snacksPerDay,
  fitnessLevel, workoutLocation, equipment, limitations,
  workoutFrequency, sessionDuration, fitnessGoals, exerciseCategories
}) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "en" ? "en-US" : "el-GR";
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(getTodayKey());
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWeightChart, setShowWeightChart] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const savedGrocery = savedPlans?.find(p => p.type === "grocery");
  const [groceryList, setGroceryList] = useState(() => {
    if (!savedGrocery?.content) return null;
    // Handle both old text format and new JSON format
    if (typeof savedGrocery.content === "object") return savedGrocery.content;
    try { return JSON.parse(savedGrocery.content); } catch { return null; }
  });
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [groceryExpanded, setGroceryExpanded] = useState(false);
  const groceryRef = useRef(null);

  async function generateGroceryList(plan) {
    if (!plan?.content) return;
    setGroceryLoading(true);
    setGroceryList(null);
    setGroceryExpanded(true);
    // Scroll 1: bring grocery section into view
    groceryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const isEn = i18n.language === "en";
      const systemPrompt = isEn
        ? `Extract a grocery list from a weekly meal plan. Return a JSON object.
RULES:
- Group into categories (Meat & Fish, Dairy & Eggs, Vegetables & Fruits, Grains & Legumes, Other)
- Merge similar ingredients into one line with total quantity
- Each category: emoji, name, items array [{name, quantity}]
- Do not break down by day — totals only`
        : `Εξήγαγε λίστα σούπερ μάρκετ από εβδομαδιαίο πρόγραμμα διατροφής. Επέστρεψε JSON.
ΚΑΝΟΝΕΣ:
- Ομαδοποίησε σε κατηγορίες (Κρέατα & Ψάρια, Γαλακτοκομικά & Αυγά, Λαχανικά & Φρούτα, Δημητριακά & Όσπρια, Άλλα)
- Ενοποίησε παρόμοια υλικά σε μία γραμμή με συνολική ποσότητα
- Κάθε κατηγορία: emoji, name, items array [{name, quantity}]
- Μόνο σύνολα, όχι ανά μέρα`;

      const res = await authedFetch("/.netlify/functions/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: [{ role: "user", content: plan.content }],
          jsonMode: true,
          customSchema: GROCERY_SCHEMA
        })
      });
      const data = await res.json();
      let groceryData = null;
      try {
        const raw = typeof data.advice === "string" ? JSON.parse(data.advice) : data.advice;
        groceryData = raw?.categories?.length ? raw : null;
      } catch { /* parse failed */ }

      if (groceryData) {
        setGroceryList(groceryData);
        // Scroll 2: after results loaded, scroll to show them
        setTimeout(() => groceryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        const textVersion = groceryData.categories.map(c =>
          `${c.emoji} ${c.name}\n${c.items.map(i => `${i.name}: ${i.quantity}`).join("\n")}`
        ).join("\n\n");
        onSavePlan?.({ type: "grocery", content: JSON.stringify(groceryData), date: new Date().toLocaleDateString("el-GR") });
      } else {
        setGroceryList(null);
        setGroceryExpanded(false);
      }
    } catch (e) {
      setGroceryList(null);
      setGroceryExpanded(false);
    } finally {
      setGroceryLoading(false);
    }
  }

  const streak = useMemo(() => calculateStreak(dailyLogs, targetCalories), [dailyLogs, targetCalories]);
  const sortedWeightLog = useMemo(() => [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date)), [weightLog]);
  const chartData = useMemo(() => [...(weightLog || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-30), [weightLog]);

  const firstWeight = chartData[0]?.weight;
  const lastWeight = chartData[chartData.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : null;
  const minW = chartData.length ? Math.min(...chartData.map(d => d.weight)) - 1 : 0;
  const maxW = chartData.length ? Math.max(...chartData.map(d => d.weight)) + 1 : 1;
  const range = maxW - minW || 1;
  const chartH = 90, chartW = 300;

  function handleAddWeight() {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    onAddWeight({ date: weightDate, weight: w });
    setWeightInput("");
    setShowWeightInput(false);
  }

  function getGoalLabel() {
    if (goalType === "lose") return t("goals.lose");
    if (goalType === "gain") return t("goals.gain");
    if (goalType === "fitness") return t("goals.fitness");
    return t("goals.maintain");
  }

  function getModeLabel() {
    return t("modeLabels." + mode, { defaultValue: "Balanced" });
  }

  function getRemainingColor() {
    if (remainingCalories > 100) return "#86efac";
    if (remainingCalories < -150) return "#fca5a5";
    return "#fde68a";
  }

  function getModeHint() {
    return t("modeHints." + mode, { defaultValue: "" });
  }

  const proteinPercent = macroTargets?.proteinGrams ? Math.min((totalProtein / macroTargets.proteinGrams) * 100, 100) : 0;
  const carbsPercent = macroTargets?.carbsGrams ? Math.min((totalCarbs / macroTargets.carbsGrams) * 100, 100) : 0;
  const fatPercent = macroTargets?.fatGrams ? Math.min((totalFat / macroTargets.fatGrams) * 100, 100) : 0;

  const mealPlan = savedPlans?.find(p => p.type === "meal");
  const trainingPlan = savedPlans?.find(p => p.type === "training");

  function PlanSection({ plan, type, emoji, title }) {
    const isExpanded = expandedPlan === type;
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: plan && !isExpanded ? 0 : 8, minHeight: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{emoji} {title}</span>
            {plan && !isExpanded && (
              <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span> {plan.date}
              </span>
            )}
          </div>
          {plan && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button className="btn btn-light" onClick={() => setExpandedPlan(isExpanded ? null : type)} type="button" style={{ fontSize: 11, padding: "4px 8px" }}>{isExpanded ? "▲" : "▼"}</button>
              <button className="btn btn-dark" onClick={() => exportToPDF(plan)} type="button" style={{ fontSize: 11, padding: "4px 8px" }}>📄 PDF</button>
              <button className="btn btn-light" onClick={() => { onDeletePlan(type); setExpandedPlan(null); }} type="button" style={{ fontSize: 11, padding: "4px 8px" }}>✕</button>
            </div>
          )}
        </div>
        {!plan ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "10px 14px", border: "1px dashed var(--border-color)" }}>
            <div className="muted" style={{ fontSize: 12 }}>{type === "meal" ? t("summary.noMealPlan") : t("summary.noTrainingPlan")}</div>
          </div>
        ) : isExpanded ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "12px 14px", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 420, overflowY: "auto", border: "1px solid var(--border-soft)", scrollbarWidth: "thin" }}>
            {plan.content}
          </div>
        ) : null}
      </div>
    );
  }

  function GrocerySection() {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: (groceryExpanded || groceryLoading || (!groceryList && mealPlan)) ? 8 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0 }}>🛒 {t("summary.groceryList")}</span>
          </div>
          {groceryList ? (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button className="btn btn-light" onClick={() => setGroceryExpanded(e => !e)} type="button" style={{ fontSize: 11, padding: "4px 8px" }}>{groceryExpanded ? "▲" : "▼"}</button>
              <button className="btn btn-dark" onClick={() => exportGroceryToPDF(groceryList)} type="button" style={{ fontSize: 11, padding: "4px 8px" }}>📄 PDF</button>
              <button className="btn btn-light" onClick={() => { setGroceryList(null); setGroceryExpanded(false); onDeletePlan("grocery"); }} type="button" style={{ fontSize: 11, padding: "4px 8px" }}>✕</button>
            </div>
          ) : mealPlan && !groceryLoading ? (
            <button className="btn btn-light" onClick={() => generateGroceryList(mealPlan)} type="button" style={{ fontSize: 11, padding: "4px 10px" }}>🛒 {t("summary.groceryBtn")}</button>
          ) : null}
        </div>
        {groceryLoading ? (
          <div className="muted" style={{ fontSize: 13 }}>{t("summary.groceryLoading")}</div>
        ) : groceryList && groceryExpanded ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "12px 14px", maxHeight: 420, overflowY: "auto", border: "1px solid var(--border-soft)", scrollbarWidth: "thin" }}>
            <GroceryListView data={groceryList} />
          </div>
        ) : !groceryList && !groceryLoading ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "12px 14px", border: "1px dashed var(--border-color)" }}>
            <div className="muted" style={{ fontSize: 12 }}>{mealPlan ? t("summary.groceryReady") : t("summary.groceryNeedPlan")}</div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {/* 1. HERO */}
      <div className="hero-card">
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 10 }}>
          {userName ? t("summary.titleName", { name: userName }) : t("summary.title")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {formatDisplayDate(selectedDate, dateLocale)}
            {isToday && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>· {t("common.today")}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isToday && <button className="btn btn-light" onClick={() => setSelectedDate(getTodayKey())} type="button" style={{ fontSize: 12, padding: "6px 10px" }}>{t("common.today")}</button>}
            <span style={{ fontSize: 11, opacity: 0.7 }}>{i18n.language === "en" ? "Log past day" : "Καταγραφή προηγούμενης ημέρας"}</span>
            <button type="button" onClick={() => setShowDatePicker(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0 }}>📅</button>
          </div>
        </div>
        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div className="hero-stat" style={{ flex: 1.3, textAlign: "center", padding: "10px 4px" }}>
              <div className="hero-subtle" style={{ fontSize: 9, marginBottom: 3 }}>{t("summary.remaining")}</div>
              <div style={{ fontWeight: 800, fontSize: 28, lineHeight: 1, color: getRemainingColor() }}>{formatNumber(remainingCalories)}</div>
              <div className="hero-subtle" style={{ fontSize: 9, marginTop: 3 }}>kcal</div>
            </div>
            <div className="hero-subtle" style={{ fontSize: 16, fontWeight: 700, flexShrink: 0 }}>=</div>
            <div className="hero-stat" style={{ flex: 1, textAlign: "center", padding: "8px 4px" }}>
              <div className="hero-subtle" style={{ fontSize: 9, marginBottom: 3 }}>{t("summary.target")}</div>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{formatNumber(targetCalories)}</div>
              <div className="hero-subtle" style={{ fontSize: 9, marginTop: 3 }}>kcal</div>
            </div>
            <div className="hero-subtle" style={{ fontSize: 14, flexShrink: 0, opacity: 0.5 }}>−</div>
            <div className="hero-stat" style={{ flex: 1, textAlign: "center", padding: "8px 4px" }}>
              <div className="hero-subtle" style={{ fontSize: 9, marginBottom: 3 }}>{t("summary.food")}</div>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{formatNumber(totalCalories)}</div>
              <div className="hero-subtle" style={{ fontSize: 9, marginTop: 3 }}>kcal</div>
            </div>
            <div className="hero-subtle" style={{ fontSize: 14, flexShrink: 0, opacity: 0.5 }}>+</div>
            <div className="hero-stat" style={{ flex: 1, textAlign: "center", padding: "8px 4px" }}>
              <div className="hero-subtle" style={{ fontSize: 9, marginBottom: 3 }}>{t("summary.exercise")}</div>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{formatNumber(exerciseValue)}</div>
              <div className="hero-subtle" style={{ fontSize: 9, marginTop: 3 }}>kcal</div>
            </div>
          </div>
        </div>
        <div className="progress-outer"><div className="progress-inner" style={{ width: `${progress}%` }} /></div>

        {/* MACROS — compact inline */}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Protein", value: `${formatNumber(totalProtein)}g / ${formatNumber(macroTargets?.proteinGrams || 0)}g`, pct: proteinPercent, cls: "macro-bar-protein" },
            { label: "Carbs", value: `${formatNumber(totalCarbs)}g / ${formatNumber(macroTargets?.carbsGrams || 0)}g`, pct: carbsPercent, cls: "macro-bar-carbs" },
            { label: "Fat", value: `${formatNumber(totalFat)}g / ${formatNumber(macroTargets?.fatGrams || 0)}g`, pct: fatPercent, cls: "macro-bar-fat" },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 50, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>{m.label}</div>
              <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 999, overflow: "hidden" }}>
                <div className={m.cls} style={{ height: "100%", borderRadius: 999, transition: "width 0.3s ease", width: `${m.pct}%` }} />
              </div>
              <div style={{ width: 75, fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: "right", flexShrink: 0 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Goal badge */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.08)", borderRadius: 10 }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{getGoalLabel()} · {getModeLabel()}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{getModeHint()}</div>
          </div>
        </div>
      </div>

      {/* 2. AI COACH + PLANS (connected) */}
      <div style={{ background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border-soft)", boxShadow: "var(--shadow-card)", marginBottom: 16 }}>
        <div style={{ padding: 16 }}>
          <AiCoach
            last7Days={last7Days} dailyLogs={dailyLogs} targetCalories={targetCalories}
            proteinTarget={proteinTarget} mode={mode} goalType={goalType} streak={streak}
            weightLog={weightLog} favoriteFoods={favoriteFoods} foods={foods}
            totalCalories={totalCalories} totalProtein={totalProtein} totalCarbs={totalCarbs} totalFat={totalFat} exerciseValue={exerciseValue}
            macroTargets={macroTargets}
            remainingCalories={remainingCalories}
            favoriteExercises={favoriteExercises}
            age={age} weight={weight} height={height} gender={gender}
            savedPlans={savedPlans} onSavePlan={onSavePlan}
            session={session} userName={userName} onShowAuth={onShowAuth} onShowRegister={onShowRegister}
            foodCategories={foodCategories} allergies={allergies} cookingLevel={cookingLevel} cookingTime={cookingTime} simpleMode={simpleMode}
            mealsPerDay={mealsPerDay} snacksPerDay={snacksPerDay}
            fitnessLevel={fitnessLevel} workoutLocation={workoutLocation} equipment={equipment} limitations={limitations}
            workoutFrequency={workoutFrequency} sessionDuration={sessionDuration} fitnessGoals={fitnessGoals} exerciseCategories={exerciseCategories}
          />
        </div>

        {/* PLANS — connected under AI Coach */}
        <div style={{ borderTop: "1px solid var(--border-soft)", padding: "12px 16px" }}>
          <PlanSection plan={mealPlan} type="meal" emoji="🥗" title={t("summary.mealPlan")} />
        </div>

        <div ref={groceryRef} style={{ borderTop: "1px solid var(--border-soft)", padding: "12px 16px", scrollMarginTop: 12 }}>
          <GrocerySection />
        </div>

        <div style={{ borderTop: "1px solid var(--border-soft)", padding: "12px 16px" }}>
          <PlanSection plan={trainingPlan} type="training" emoji="💪" title={t("summary.trainingPlan")} />
        </div>
      </div>

      {/* 5. ΠΡΟΟΔΟΣ */}
      <div className="card">
        <h2>{t("summary.progress")}</h2>

        {/* Εισαγωγή βάρους — collapsible */}
        <button className="btn btn-light" onClick={() => setShowWeightInput(!showWeightInput)} type="button"
          style={{ width: "100%", marginBottom: showWeightInput ? 10 : 12, fontSize: 12 }}>
          {showWeightInput ? `⚖️ ${t("summary.weightEntry")} ▲` : `⚖️ ${t("summary.weightEntry")} ▼`}
        </button>
        {showWeightInput && (
          <div style={{ marginBottom: 12 }}>
            {lastWeight && (
              <div style={{ display: "flex", gap: 12, marginBottom: 10, background: "var(--bg-soft)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border-soft)" }}>
                <div>
                  <div className="muted" style={{ fontSize: 11 }}>{t("summary.lastWeight")}</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{lastWeight} kg</div>
                </div>
                {diff !== null && (
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>{t("summary.thirtyDays")}</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: diff <= 0 ? "#22c55e" : "#ef4444" }}>
                      {diff > 0 ? "+" : ""}{Math.round(diff * 10) / 10} kg
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="input" type="number" step="0.1" placeholder="kg" inputMode="decimal"
                value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
                style={{ flex: 1, padding: "10px 12px" }} />
              <input className="input" type="date" value={weightDate} max={getTodayKey()}
                onChange={(e) => { const v = e.target.value; if (v && v <= getTodayKey()) setWeightDate(v); }}
                style={{ flex: 1, padding: "10px 12px" }} />
              <button className="btn btn-dark" onClick={handleAddWeight} type="button"
                style={{ flexShrink: 0, padding: "10px 14px" }}>+</button>
            </div>
          </div>
        )}

        {/* Ιστορικό βάρους */}
        {sortedWeightLog.length > 0 && (
          <>
            <button className="btn btn-light" onClick={() => setShowWeightHistory(!showWeightHistory)} type="button"
              style={{ width: "100%", marginBottom: showWeightHistory ? 8 : 0, fontSize: 12 }}>
              {showWeightHistory ? t("summary.hideHistory") : t("summary.showHistory", { count: sortedWeightLog.length })}
            </button>
            {showWeightHistory && (
              <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 8 }}>
                {sortedWeightLog.slice(0, 10).map((entry) => (
                  <div key={entry.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
                    <span className="muted">{formatDisplayDate(entry.date, dateLocale)}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700 }}>{entry.weight} kg</span>
                      <button className="btn btn-light" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => onDeleteWeight(entry.date)} type="button">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Γράφημα — μετά το ιστορικό */}
        {chartData.length >= 2 && (
          <button className="btn btn-light" onClick={() => setShowWeightChart(!showWeightChart)} type="button"
            style={{ width: "100%", marginTop: 10, marginBottom: showWeightChart ? 8 : 0, fontSize: 12 }}>
            {showWeightChart ? t("summary.hideChart") : t("summary.showChart")}
          </button>
        )}
        {showWeightChart && chartData.length >= 2 && (
          <div style={{ marginBottom: 10, overflowX: "auto" }}>
            <svg viewBox={`0 0 ${chartW} ${chartH + 16}`} style={{ width: "100%", maxWidth: chartW }}>
              {chartData.map((point, i) => {
                const x = (i / (chartData.length - 1)) * (chartW - 20) + 10;
                const y = chartH - ((point.weight - minW) / range) * (chartH - 10) + 5;
                const next = chartData[i + 1];
                const nx = next ? ((i + 1) / (chartData.length - 1)) * (chartW - 20) + 10 : null;
                const ny = next ? chartH - ((next.weight - minW) / range) * (chartH - 10) + 5 : null;
                const showLabel = i === 0 || i === chartData.length - 1 || i % Math.ceil(chartData.length / 5) === 0;
                return (
                  <g key={point.date}>
                    {next && <line x1={x} y1={y} x2={nx} y2={ny} stroke="var(--color-accent,#111)" strokeWidth="1.5" />}
                    <circle cx={x} cy={y} r="3" fill="var(--color-accent,#111)" />
                    {showLabel && <text x={x} y={chartH + 14} textAnchor="middle" fontSize="7" fill="var(--text-muted,#888)">{point.date.slice(5)}</text>}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Streak */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-soft)", borderRadius: 12, border: "1px solid var(--border-soft)", marginTop: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{t("summary.streak", { emoji: getStreakEmoji(streak) })}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{t("summary.streakDesc")}</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 28, lineHeight: 1 }}>
            {streak}<span className="muted" style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{t("common.days")}</span>
          </div>
        </div>
      </div>

      {/* 6. ΙΣΤΟΡΙΚΟ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>{t("summary.last7")}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isToday && <button className="btn btn-light" onClick={() => setSelectedDate(getTodayKey())} type="button" style={{ fontSize: 12, padding: "6px 10px" }}>{t("common.today")}</button>}
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{i18n.language === "en" ? "Log past day" : "Καταγραφή προηγούμενης ημέρας"}</span>
            <button type="button" onClick={() => setShowDatePicker(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0 }}>📅</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {last7Days.map((day) => {
            const isExpanded = expandedDay === day.date;
            const hasDetails = day.protein > 0 || day.exercise > 0;
            return (
            <div key={day.date} style={{ borderRadius: 10, border: "1px solid var(--border-soft)", background: "var(--bg-soft)", color: "var(--text-primary)", overflow: "hidden" }}>
              <button onClick={() => setExpandedDay(isExpanded ? null : day.date)} type="button"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 12px", background: "transparent", color: "inherit", border: "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  <span style={{ fontSize: 10, marginRight: 4 }}>{isExpanded ? "▲" : "▼"}</span>
                  {formatDisplayDate(day.date, dateLocale)}
                </span>
                <span style={{ fontSize: 12 }}
                  className={day.remaining >= 0 ? "summary-history-remaining-positive" : "summary-history-remaining-negative"}>
                  {t("summary.remaining")} {day.remaining >= 0 ? "+" : ""}{formatNumber(day.remaining)} kcal · {t("summary.food")} {formatNumber(day.eaten)} kcal{day.exercise > 0 ? ` · ${t("summary.exercise")} ${formatNumber(day.exercise)} kcal` : ""}
                </span>
              </button>
              {isExpanded && (
                <div style={{ padding: "4px 12px 10px", display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11 }}>
                  {day.eaten > 0 || day.exercise > 0 ? (
                    <>
                      <span style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "3px 8px", color: day.remaining >= 0 ? "#16a34a" : "#dc2626" }}>📊 <strong>{t("summary.remaining")}:</strong> {day.remaining >= 0 ? "+" : ""}{formatNumber(day.remaining)} kcal</span>
                      <span style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "3px 8px" }}>🎯 <strong>{t("summary.target")}:</strong> {formatNumber(targetCalories)} kcal</span>
                      <span style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "3px 8px" }}>🍽️ <strong>{t("summary.food")}:</strong> {formatNumber(day.eaten)} kcal</span>
                      {day.exercise > 0 && <span style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "3px 8px" }}>🏃 <strong>{t("summary.exercise")}:</strong> {formatNumber(day.exercise)} kcal</span>}
                      {day.protein > 0 && <span style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "3px 8px" }}>🥩 <strong>Protein:</strong> {day.protein}g</span>}
                      {day.carbs > 0 && <span style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "3px 8px" }}>🍞 <strong>Carbs:</strong> {day.carbs}g</span>}
                      {day.fat > 0 && <span style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "3px 8px" }}>🧈 <strong>Fat:</strong> {day.fat}g</span>}
                    </>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>{i18n.language === "en" ? "No data logged" : "Χωρίς καταγραφή"}</span>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>

      {showDatePicker && (
        <DatePickerModal
          selectedDate={selectedDate}
          onSelect={(d) => setSelectedDate(d)}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </>
  );
}