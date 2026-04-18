// src/components/tabs/SummaryTab.jsx
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDisplayDate, formatNumber, formatPlanDate, getTodayKey } from "../../utils/helpers";
import { calculateStreak, getStreakEmoji } from "../../utils/streak";
import { authedFetch } from "../../utils/authFetch";
import { buildLiveTips } from "../../utils/liveTips";
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
  workoutFrequency, sessionDuration, fitnessGoals, exerciseCategories,
  healthFactors, activity,
  dashboardTips,
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
  const [macrosOpen, setMacrosOpen] = useState(() => sessionStorage.getItem('ft_sum_macros') === 'true');
  const [progressOpen, _setProgressOpen] = useState(() => sessionStorage.getItem('ft_sum_progress') === 'true');
  const [historyOpen, _setHistoryOpen] = useState(() => sessionStorage.getItem('ft_sum_history') === 'true');
  const setProgressOpen = (v) => { _setProgressOpen(p => { const n = typeof v === 'function' ? v(p) : v; sessionStorage.setItem('ft_sum_progress', n); return n; }); };
  const setHistoryOpen = (v) => { _setHistoryOpen(p => { const n = typeof v === 'function' ? v(p) : v; sessionStorage.setItem('ft_sum_history', n); return n; }); };
  const savedGrocery = savedPlans?.find(p => p.type === "grocery");
  const [groceryList, setGroceryList] = useState(() => {
    if (!savedGrocery?.content) return null;
    if (typeof savedGrocery.content === "object") return savedGrocery.content;
    try { return JSON.parse(savedGrocery.content); } catch { return null; }
  });
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [groceryExpanded, setGroceryExpanded] = useState(false);
  const [groceryError, setGroceryError] = useState(null);
  const groceryRef = useRef(null);
  const coachSectionRef = useRef(null);

  async function generateGroceryList(plan) {
    if (!plan?.content) return;
    setGroceryLoading(true);
    setGroceryList(null);
    setGroceryExpanded(true);
    setGroceryError(null);
    // Scroll 1 — bring AI Coach section to top of viewport.
    // Uses document.scrollingElement.scrollTo() (NOT scrollIntoView)
    // because scrollIntoView silently no-ops on iOS Safari and
    // Android WebView on the first call. Offset is measured from the
    // live .app-header element so the target lands just below the
    // fixed header on any platform (iOS/Android/web).
    const coachEl = coachSectionRef.current;
    if (coachEl) {
      const scroller = document.scrollingElement || document.documentElement;
      const coachRect = coachEl.getBoundingClientRect();
      const headerEl = document.querySelector(".app-header");
      const headerOffset = headerEl ? headerEl.offsetHeight + 12 : 84;
      const targetTop = scroller.scrollTop + coachRect.top - headerOffset;
      scroller.scrollTo({ top: targetTop, behavior: "smooth" });
    }
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      let groceryData = null;
      try {
        const raw = typeof data.advice === "string" ? JSON.parse(data.advice) : data.advice;
        groceryData = raw?.categories?.length ? raw : null;
      } catch { /* parse failed */ }

      if (groceryData) {
        setGroceryList(groceryData);
        onSavePlan?.({ type: "grocery", content: JSON.stringify(groceryData), date: new Date().toLocaleDateString("el-GR") });
      } else {
        throw new Error(isEn ? "Could not parse grocery data" : "Αποτυχία ανάλυσης δεδομένων");
      }
    } catch (e) {
      console.error("Grocery list error:", e);
      setGroceryList(null);
      setGroceryExpanded(false);
      setGroceryError(e.message || t("summary.groceryError"));
    } finally {
      setGroceryLoading(false);
      // Scroll 2 — after React renders, scroll grocery section to top.
      // Uses double rAF + 300ms timeout (same proven pattern as AiCoach)
      // to wait for layout settle on Android WebView and iOS Safari.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const groceryEl = groceryRef.current;
            if (groceryEl) {
              const groceryRect = groceryEl.getBoundingClientRect();
              const scroller = document.scrollingElement || document.documentElement;
              const headerEl = document.querySelector(".app-header");
              const headerOffset = headerEl ? headerEl.offsetHeight + 12 : 84;
              const targetTop = scroller.scrollTop + groceryRect.top - headerOffset;
              scroller.scrollTo({ top: targetTop, behavior: "smooth" });
            }
          }, 300);
        });
      });
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
    const lightPillStyle = { fontSize: 11, padding: "4px 8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
    const darkPillStyle = { fontSize: 11, padding: "4px 8px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", color: "white", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: plan && !isExpanded ? 0 : 8, minHeight: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0, color: "white" }}>{emoji} {title}</span>
            {plan && !isExpanded && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span> {formatPlanDate(plan.date)}
              </span>
            )}
          </div>
          {plan && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => setExpandedPlan(isExpanded ? null : type)} type="button" style={lightPillStyle}>{isExpanded ? "▲" : "▼"}</button>
              <button onClick={() => exportToPDF(plan)} type="button" style={darkPillStyle}>📄 PDF</button>
              <button onClick={() => { onDeletePlan(type); setExpandedPlan(null); }} type="button" style={lightPillStyle}>✕</button>
            </div>
          )}
        </div>
        {!plan ? (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", border: "1px dashed rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{type === "meal" ? t("summary.noMealPlan") : t("summary.noTrainingPlan")}</div>
          </div>
        ) : isExpanded ? (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 420, overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", scrollbarWidth: "thin", color: "rgba(255,255,255,0.92)" }}>
            {plan.content}
          </div>
        ) : null}
      </div>
    );
  }

  function GrocerySection() {
    const lightPillStyle = { fontSize: 11, padding: "4px 8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
    const darkPillStyle = { fontSize: 11, padding: "4px 8px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", color: "white", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: (groceryExpanded || groceryLoading || (!groceryList && mealPlan)) ? 8 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0, color: "white" }}>🛒 {t("summary.groceryList")}</span>
          </div>
          {groceryList ? (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => setGroceryExpanded(e => !e)} type="button" style={lightPillStyle}>{groceryExpanded ? "▲" : "▼"}</button>
              <button onClick={() => exportGroceryToPDF(groceryList)} type="button" style={darkPillStyle}>📄 PDF</button>
              <button onClick={() => { setGroceryList(null); setGroceryExpanded(false); onDeletePlan("grocery"); }} type="button" style={lightPillStyle}>✕</button>
            </div>
          ) : mealPlan && !groceryLoading ? (
            <button onClick={() => generateGroceryList(mealPlan)} type="button" style={{ ...lightPillStyle, padding: "4px 10px" }}>🛒 {t("summary.groceryBtn")}</button>
          ) : null}
        </div>
        {groceryError && (
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 8, fontSize: 12, color: "#fca5a5" }}>
            {groceryError}
            <button type="button" onClick={() => setGroceryError(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#fca5a5" }}>✕</button>
          </div>
        )}
        {groceryLoading ? (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{t("summary.groceryLoading")}</div>
        ) : groceryList && groceryExpanded ? (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", maxHeight: 420, overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", scrollbarWidth: "thin", color: "rgba(255,255,255,0.92)" }}>
            <GroceryListView data={groceryList} />
          </div>
        ) : !groceryList && !groceryLoading ? (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", border: "1px dashed rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{mealPlan ? t("summary.groceryReady") : t("summary.groceryNeedPlan")}</div>
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
          {t("summary.title")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {formatDisplayDate(selectedDate, dateLocale)}
            {isToday && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>· {t("common.today")}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isToday && <button className="btn btn-light" onClick={() => setSelectedDate(getTodayKey())} type="button" style={{ fontSize: 12, padding: "6px 10px" }}>{t("common.today")}</button>}
            <span style={{ fontSize: 11, opacity: 0.7 }}>{i18n.language === "en" ? "Log data for past days" : "Καταγραφή προηγούμενων ημερών"}</span>
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

        {/* MACROS — collapsible */}
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={() => { const key = 'ft_sum_macros'; const cur = sessionStorage.getItem(key) === 'true'; sessionStorage.setItem(key, !cur); setMacrosOpen(!cur); }}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 16, border: "none", background: "rgba(255,255,255,0.08)", cursor: "pointer", color: "rgba(255,255,255,0.9)", fontSize: 18, fontWeight: 700 }}>
            <span>Macros</span>
            <span style={{ fontSize: 11 }}>{macrosOpen ? "▲" : "▼"}</span>
          </button>
          {macrosOpen && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          {/*
            Hero-card Macros layout:
              Row 1 — calorie donut centred. Arc colour mirrors
                getRemainingColor() so it tracks the big "Remaining"
                number above the hero card.
              Row 2 — macro target pie on the left, per-macro list
                on the right. Each list row shows emoji + label +
                current/target grams plus a thin coloured progress
                bar. Slice colours and bar classes share
                #3b82f6 / #f59e0b / #ef4444 so eyes can jump between
                the pie and the list without re-mapping.
          */}
          {(() => {
            // Symmetrical two-row layout:
            //   Row 1 — calorie donut on the left, 👉 tips on the right
            //   Row 2 — macro target pie on the left, per-macro bars
            //           with current/target grams on the right
            // Both pies render at the same visible diameter so the
            // rows read as equal-weight pairs.
            const CHART_SIZE = 150;
            const cx = CHART_SIZE / 2;

            // ------- Calorie donut -------
            const calStroke = 12;
            const calRadius = (CHART_SIZE - calStroke) / 2;
            const calCircumference = 2 * Math.PI * calRadius;
            const calFilledPct = Math.max(0, Math.min(progress, 100));
            const calDashOffset = calCircumference * (1 - calFilledPct / 100);
            const calArcColor = getRemainingColor();

            // ------- Macro pie (filled target distribution + outer
            //         ring showing actual-eaten intake distribution).
            // Both live inside CHART_SIZE so the macro pie stays
            // visually identical in footprint to the calorie donut.
            // -----------------------------------------------------
            const pTarget = macroTargets?.proteinGrams || 0;
            const cTarget = macroTargets?.carbsGrams || 0;
            const fTarget = macroTargets?.fatGrams || 0;
            const targetKcal = pTarget * 4 + cTarget * 4 + fTarget * 9;
            const actualKcal = (totalProtein || 0) * 4 + (totalCarbs || 0) * 4 + (totalFat || 0) * 9;
            const showMacroPie = targetKcal > 0;
            const ringStroke = 8;
            const ringGap = 3;
            const pieR = (CHART_SIZE / 2) - ringStroke - ringGap - 2; // inner filled pie
            const ringR = (CHART_SIZE / 2) - (ringStroke / 2) - 2;    // outer ring centreline

            const polar = (angleDeg, r) => {
              const rad = ((angleDeg - 90) * Math.PI) / 180;
              return [cx + r * Math.cos(rad), cx + r * Math.sin(rad)];
            };
            const slicePath = (startAngle, sliceAngle, r) => {
              const endAngle = startAngle + sliceAngle;
              const [x1, y1] = polar(startAngle, r);
              const [x2, y2] = polar(endAngle, r);
              const largeArc = sliceAngle > 180 ? 1 : 0;
              return `M ${cx} ${cx} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            };
            const arcPath = (startAngle, sliceAngle, r) => {
              const endAngle = startAngle + sliceAngle;
              const [x1, y1] = polar(startAngle, r);
              const [x2, y2] = polar(endAngle, r);
              const largeArc = sliceAngle > 180 ? 1 : 0;
              return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
            };

            let macroPie = null;
            if (showMacroPie) {
              const sliceData = [
                { color: "#3b82f6", kcal: pTarget * 4, actualKcal: (totalProtein || 0) * 4 },
                { color: "#f59e0b", kcal: cTarget * 4, actualKcal: (totalCarbs || 0) * 4 },
                { color: "#ef4444", kcal: fTarget * 9, actualKcal: (totalFat || 0) * 9 },
              ];
              let cumulativeAngle = 0;
              const slices = sliceData.map((s, i) => {
                const sliceAngle = (s.kcal / targetKcal) * 360;
                const startAngle = cumulativeAngle;
                const labelAngle = startAngle + sliceAngle / 2;
                const [lx, ly] = polar(labelAngle, pieR * 0.62);
                const pct = Math.round((s.kcal / targetKcal) * 100);
                const path = slicePath(startAngle, sliceAngle, pieR);
                cumulativeAngle += sliceAngle;
                return (
                  <g key={`s-${i}`}>
                    <path d={path} fill={s.color} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
                    {pct >= 8 && (
                      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize={13} fontWeight={800}
                        style={{ pointerEvents: "none" }}>
                        {pct}%
                      </text>
                    )}
                  </g>
                );
              });

              // Outer ring — same-macro colour arcs whose lengths encode
              // each macro's share of the kcal EATEN today (vs. the inner
              // pie which encodes the TARGET share). When the outer
              // arcs mirror the inner slices the day's intake matches
              // the macro goal; a visible mismatch means one macro is
              // drifting and the corresponding 👉 tip on row 1 will
              // explain which way.
              let ringSegments = null;
              if (actualKcal > 0) {
                let ringCum = 0;
                ringSegments = sliceData.map((s, i) => {
                  const segAngle = (s.actualKcal / actualKcal) * 360;
                  if (segAngle <= 0.1) return null;
                  const startAngle = ringCum;
                  const path = arcPath(startAngle, Math.max(segAngle - 0.5, 0.1), ringR);
                  ringCum += segAngle;
                  return (
                    <path key={`r-${i}`} d={path}
                      stroke={s.color} strokeWidth={ringStroke} fill="none"
                      strokeLinecap="butt" />
                  );
                });
              }

              macroPie = (
                <svg width={CHART_SIZE} height={CHART_SIZE} role="img" aria-label="macro target distribution with intake ring">
                  <circle cx={cx} cy={cx} r={ringR}
                    stroke="rgba(255,255,255,0.12)" strokeWidth={ringStroke} fill="none" />
                  {ringSegments}
                  {slices}
                </svg>
              );
            }

            // Rule-based live-state tips. App.jsx computes the
            // Dashboard/Food/Exercise tip sets centrally so the user
            // never sees the same line twice when scrolling between
            // tabs — we just consume what it passes in. Fall back to
            // computing locally if the prop isn't wired yet (keeps
            // the component usable in isolation / tests).
            const displayTips = Array.isArray(dashboardTips) ? dashboardTips : buildLiveTips({
              t,
              formatNumber,
              remainingCalories,
              totalCalories,
              totalProtein,
              totalCarbs,
              totalFat,
              exerciseValue,
              targetCalories,
              proteinTarget: pTarget,
              carbsTarget: cTarget,
              fatTarget: fTarget,
              goalType,
              mode,
              isToday,
              last7Days,
              streak,
              weightLog,
              surface: "DASHBOARD",
              max: 3,
            });

            const macroList = [
              { emoji: "🥩", label: "Protein", color: "#3b82f6", cur: totalProtein, tgt: pTarget, pct: proteinPercent, cls: "macro-bar-protein" },
              { emoji: "🍞", label: "Carbs",   color: "#f59e0b", cur: totalCarbs,   tgt: cTarget, pct: carbsPercent,   cls: "macro-bar-carbs" },
              { emoji: "🥑", label: "Fat",     color: "#ef4444", cur: totalFat,     tgt: fTarget, pct: fatPercent,     cls: "macro-bar-fat" },
            ];

            const sideColStyle = { display: "flex", flexDirection: "column", gap: 8, flex: "1 1 180px", minWidth: 160, maxWidth: 280 };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "4px 0 10px" }}>
                {/* Row 1 — calorie donut + tips */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                  <svg width={CHART_SIZE} height={CHART_SIZE} role="img" aria-label="remaining calories">
                    <circle cx={cx} cy={cx} r={calRadius}
                      stroke="rgba(255,255,255,0.15)" strokeWidth={calStroke} fill="none" />
                    <circle cx={cx} cy={cx} r={calRadius}
                      stroke={calArcColor} strokeWidth={calStroke} fill="none"
                      strokeLinecap="round"
                      strokeDasharray={calCircumference}
                      strokeDashoffset={calDashOffset}
                      transform={`rotate(-90 ${cx} ${cx})`}
                      style={{ transition: "stroke-dashoffset 0.4s ease" }}
                    />
                    <text x={cx} y={cx - 4} textAnchor="middle" fill="rgba(255,255,255,0.95)"
                      fontSize={28} fontWeight={800} style={{ fontFamily: "inherit" }}>
                      {formatNumber(Math.max(remainingCalories, 0))}
                    </text>
                    <text x={cx} y={cx + 14} textAnchor="middle" fill="rgba(255,255,255,0.6)"
                      fontSize={10} fontWeight={700} style={{ fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase" }}>
                      {t("summary.remaining")}
                    </text>
                    <text x={cx} y={cx + 30} textAnchor="middle" fill="rgba(255,255,255,0.55)"
                      fontSize={10} style={{ fontFamily: "inherit" }}>
                      / {formatNumber(targetCalories)}
                    </text>
                  </svg>
                  <div style={sideColStyle}>
                    {displayTips.map((tipText, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, lineHeight: 1.35, color: "rgba(255,255,255,0.9)" }}>
                        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.2 }}>👉</span>
                        <span>{tipText}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 2 — macro pie + per-macro bars list */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                  {macroPie}
                  <div style={sideColStyle}>
                    {macroList.map((m) => (
                      <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                          <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span
                              aria-hidden="true"
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: m.color,
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                            {m.label} {m.emoji}
                          </span>
                          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
                            {formatNumber(m.cur)}g
                            <span style={{ color: "rgba(255,255,255,0.4)" }}> / {formatNumber(m.tgt)}g</span>
                          </span>
                        </div>
                        <div style={{ height: 7, background: "rgba(255,255,255,0.15)", borderRadius: 999, overflow: "hidden" }}>
                          <div className={m.cls} style={{ height: "100%", borderRadius: 999, transition: "width 0.3s ease", width: `${m.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          </div>
          )}
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

      {/* 2. AI COACH + PLANS (connected) — single dark gradient card
          wrapping both the Coach (hero + quick actions + suggestions
          + input) and the plan rows (meal / grocery / training) so
          the gradient flows uninterrupted from top to bottom. */}
      <div ref={coachSectionRef} style={{
        background: "linear-gradient(135deg, var(--bg-hero-from) 0%, var(--bg-hero-to) 100%)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "var(--shadow-card)",
        marginBottom: 16,
        scrollMarginTop: 12,
        color: "white",
        overflow: "hidden",
      }}>
        <div style={{ padding: 16 }}>
          <AiCoach
            last7Days={last7Days} dailyLogs={dailyLogs} targetCalories={targetCalories}
            proteinTarget={proteinTarget} mode={mode} goalType={goalType} streak={streak}
            weightLog={weightLog} favoriteFoods={favoriteFoods} foods={foods}
            totalCalories={totalCalories} totalProtein={totalProtein} totalCarbs={totalCarbs} totalFat={totalFat} exerciseValue={exerciseValue}
            macroTargets={macroTargets} activity={activity}
            remainingCalories={remainingCalories}
            favoriteExercises={favoriteExercises}
            age={age} weight={weight} height={height} gender={gender}
            savedPlans={savedPlans} onSavePlan={onSavePlan}
            session={session} userName={userName} onShowAuth={onShowAuth} onShowRegister={onShowRegister}
            foodCategories={foodCategories} allergies={allergies} cookingLevel={cookingLevel} cookingTime={cookingTime} simpleMode={simpleMode}
            mealsPerDay={mealsPerDay} snacksPerDay={snacksPerDay}
            fitnessLevel={fitnessLevel} workoutLocation={workoutLocation} equipment={equipment} limitations={limitations}
            workoutFrequency={workoutFrequency} sessionDuration={sessionDuration} fitnessGoals={fitnessGoals} exerciseCategories={exerciseCategories}
            healthFactors={healthFactors}
          />
        </div>

        {/* PLANS — connected under AI Coach on the same dark surface.
            All three rows share an identical padding block and row
            min-height so they line up evenly regardless of whether a
            plan is saved (meal/training rows show "✓ date") or not
            (grocery row stays on a single line). The "Recent plans"
            label that precedes these rows lives inside AiCoach, sat
            just above the first border-top so the label-to-content
            gap matches the Quick actions / Ask Coach sections. */}
        <div id="ft-plans-anchor" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px", minHeight: 64, display: "flex", alignItems: "center", scrollMarginTop: 80 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PlanSection plan={mealPlan} type="meal" emoji="🥗" title={t("summary.mealPlan")} />
          </div>
        </div>

        <div ref={groceryRef} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px", minHeight: 64, display: "flex", alignItems: "center", scrollMarginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <GrocerySection />
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px", minHeight: 64, display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PlanSection plan={trainingPlan} type="training" emoji="💪" title={t("summary.trainingPlan")} />
          </div>
        </div>
      </div>

      {/* 5. ΠΡΟΟΔΟΣ */}
      <div className="card">
        <div
          onClick={() => setProgressOpen(prev => !prev)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: progressOpen ? 10 : 0, cursor: "pointer" }}
        >
          <h2 style={{ margin: 0 }}>📈 {t("summary.progress")}</h2>
          <button type="button" onClick={(e) => { e.stopPropagation(); setProgressOpen(prev => !prev); }}
            style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
            {progressOpen ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
        {progressOpen && (<>
        {/* Εισαγωγή βάρους — collapsible */}
        <button className="btn btn-light" onClick={() => setShowWeightInput(!showWeightInput)} type="button"
          style={{ width: "100%", marginBottom: showWeightInput ? 10 : 12, fontSize: 12, textAlign: "left" }}>
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
              style={{ width: "100%", marginBottom: showWeightHistory ? 8 : 0, fontSize: 12, textAlign: "left" }}>
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
            style={{ width: "100%", marginTop: 10, marginBottom: showWeightChart ? 8 : 0, fontSize: 12, textAlign: "left" }}>
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
        </>)}
      </div>

      {/* 6. ΙΣΤΟΡΙΚΟ */}
      <div className="card">
        <div
          onClick={() => setHistoryOpen(prev => !prev)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: historyOpen ? 10 : 0, cursor: "pointer" }}
        >
          <h2 style={{ margin: 0 }}>📅 {t("summary.last7")}</h2>
          <button type="button" onClick={(e) => { e.stopPropagation(); setHistoryOpen(prev => !prev); }}
            style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
            {historyOpen ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
        {historyOpen && (<>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {!isToday && <button className="btn btn-light" onClick={() => setSelectedDate(getTodayKey())} type="button" style={{ fontSize: 12, padding: "6px 10px" }}>{t("common.today")}</button>}
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{i18n.language === "en" ? "Log data for past days" : "Καταγραφή προηγούμενων ημερών"}</span>
          <button type="button" onClick={() => setShowDatePicker(true)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0 }}>📅</button>
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
        </>)}
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