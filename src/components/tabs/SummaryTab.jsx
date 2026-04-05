// src/components/tabs/SummaryTab.jsx
import { useMemo, useState } from "react";
import { formatDisplayDate, formatNumber } from "../../utils/helpers";
import { calculateStreak, getStreakEmoji } from "../../utils/streak";
import AiCoach from "../AiCoach";

function exportToPDF(plan) {
  const title = plan.type === "meal" ? "Εβδομαδιαίο Πρόγραμμα Διατροφής" : "Εβδομαδιαίο Πρόγραμμα Γυμναστικής";
  const emoji = plan.type === "meal" ? "🥗" : "💪";
  const lines = plan.content.split("\n").map(line => {
    const escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (line.startsWith("📅")) return `<div class="day-header">${escaped}</div>`;
    if (line.startsWith("Σύνολο")) return `<div class="total">${escaped}</div>`;
    if (line.startsWith("─")) return `<hr>`;
    if (line.startsWith("⚠️")) return `<div class="disclaimer">${escaped}</div>`;
    if (line.trim() === "") return `<div style="height:6px"></div>`;
    return `<div class="line">${escaped}</div>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px;color:#111;line-height:1.65;font-size:14px}.top-bar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #111;padding-bottom:14px}.title-block .main-title{font-size:20px;font-weight:bold}.title-block .sub{color:#555;font-size:13px;margin-top:4px}.btn-group{display:flex;gap:10px;flex-shrink:0}.btn{padding:12px 20px;border-radius:10px;font-size:15px;cursor:pointer;border:none;font-weight:bold;white-space:nowrap}.btn-save{background:#166534;color:white}.btn-print{background:#111;color:white}.btn-close{background:#e5e7eb;color:#111}.day-header{font-weight:bold;font-size:15px;margin-top:16px;margin-bottom:6px;background:#f3f4f6;padding:8px 12px;border-radius:6px;border-left:4px solid #111}.line{padding:3px 12px}.total{font-weight:bold;padding:5px 12px;background:#f9fafb;border-radius:4px}.disclaimer{background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:12px;color:#78350f}hr{border:none;border-top:1px solid #e5e7eb;margin:8px 0}@media print{.btn-group{display:none}body{padding:16px}}</style></head><body><div class="top-bar"><div class="title-block"><div class="main-title">${emoji} FuelTrack — ${title}</div><div class="sub">Δημιουργήθηκε: ${plan.date}</div></div><div class="btn-group"><button class="btn btn-save" onclick="window.print()">💾 Αποθήκευση</button><button class="btn btn-print" onclick="window.print()">🖨️ Εκτύπωση</button><button class="btn btn-close" onclick="window.close()">✕ Κλείσιμο</button></div></div>${lines}</body></html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

export default function SummaryTab({
  selectedDate, setSelectedDate, isToday,
  targetCalories, totalCalories, exerciseValue,
  remainingCalories, progress, goalType,
  last7Days, proteinTarget, totalProtein,
  totalCarbs, totalFat, mode, macroTargets,
  foods, dailyLogs, weightLog,
  onAddWeight, onDeleteWeight,
  favoriteFoods, favoriteFoodsText, favoriteExercisesText,
  favoriteExercises, age, weight, height, gender,
  savedPlans, onSavePlan, onDeletePlan
}) {
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [showWeightChart, setShowWeightChart] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);

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
    if (goalType === "lose") return "Απώλεια βάρους";
    if (goalType === "gain") return "Μυϊκή ανάπτυξη";
    if (goalType === "fitness") return "Fitness & Cardio";
    return "Διατήρηση";
  }

  function getModeLabel() {
    const labels = { balanced: "Balanced", mediterranean: "Μεσογειακή", whole_foods: "Whole Foods", high_protein: "High Protein", muscle_gain: "Muscle Gain", low_carb: "Low Carb", keto: "Keto", carnivore: "Carnivore", fasting_16_8: "Fasting 16:8", fasting_18_6: "Fasting 18:6", omad: "OMAD", vegetarian: "Vegetarian", vegan: "Vegan" };
    return labels[mode] || "Balanced";
  }

  function getRemainingColor() {
    if (remainingCalories > 100) return "#86efac";
    if (remainingCalories < -150) return "#fca5a5";
    return "#fde68a";
  }

  function getModeHint() {
    const hints = { balanced: "Ισορροπημένη διατροφή", mediterranean: "Ελαιόλαδο, ψάρι, λαχανικά", whole_foods: "Φυσικές, ανεπεξέργαστες τροφές", high_protein: "Υψηλή πρωτεΐνη σε κάθε γεύμα", muscle_gain: "Caloric surplus + πρωτεΐνη", low_carb: "Χαμηλοί υδατάνθρακες", keto: "Κετογονική — max 8g carbs/100g", carnivore: "Μόνο ζωικά προϊόντα", fasting_16_8: "Παράθυρο φαγητού 8 ωρών", fasting_18_6: "Παράθυρο φαγητού 6 ωρών", omad: "Ένα γεύμα την ημέρα", vegetarian: "Χωρίς κρέας", vegan: "Φυτική διατροφή" };
    return hints[mode] || "";
  }

  const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);
  const proteinPercent = macroTargets?.proteinGrams ? Math.min((totalProtein / macroTargets.proteinGrams) * 100, 100) : 0;
  const carbsPercent = macroTargets?.carbsGrams ? Math.min((totalCarbs / macroTargets.carbsGrams) * 100, 100) : 0;
  const fatPercent = macroTargets?.fatGrams ? Math.min((totalFat / macroTargets.fatGrams) * 100, 100) : 0;

  const mealPlan = savedPlans?.find(p => p.type === "meal");
  const trainingPlan = savedPlans?.find(p => p.type === "training");

  function PlanSection({ plan, type, emoji, title }) {
    const isExpanded = expandedPlan === type;
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{emoji} {title}</div>
          {plan && (
            <div style={{ display: "flex", gap: 5 }}>
              <button className="btn btn-light" onClick={() => setExpandedPlan(isExpanded ? null : type)} type="button" style={{ fontSize: 11, padding: "4px 8px" }}>{isExpanded ? "▲" : "▼"}</button>
              <button className="btn btn-dark" onClick={() => exportToPDF(plan)} type="button" style={{ fontSize: 11, padding: "4px 10px" }}>📄 PDF</button>
              <button className="btn btn-light" onClick={() => { onDeletePlan(type); setExpandedPlan(null); }} type="button" style={{ fontSize: 11, padding: "4px 8px" }}>✕</button>
            </div>
          )}
        </div>
        {!plan ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "12px 14px", border: "1px dashed var(--border-color)" }}>
            <div className="muted" style={{ fontSize: 12 }}>Δεν έχεις ακόμα {type === "meal" ? "πρόγραμμα διατροφής" : "πρόγραμμα γυμναστικής"}. Ρώτα τον AI Coach!</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>Αποθηκεύτηκε: {plan.date}</span>
              {!isExpanded && <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span>}
            </div>
            {isExpanded && (
              <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "12px 14px", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 420, overflowY: "auto", border: "1px solid var(--border-soft)", scrollbarWidth: "thin" }}>
                {plan.content}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* 1. HERO */}
      <div className="hero-card">
        <div style={{ fontWeight: 700, fontSize: 22, color: "white", marginBottom: 10 }}>Σύνοψη ημέρας</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {formatDisplayDate(selectedDate)}
            {isToday && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>· Σήμερα</span>}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!isToday && <button className="btn btn-light" onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))} type="button" style={{ fontSize: 12, padding: "6px 10px" }}>Σήμερα</button>}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button type="button" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "7px 10px", cursor: "pointer", fontSize: 18, color: "white", lineHeight: 1, display: "block" }}>📅</button>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", fontSize: 0 }} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <div className="hero-subtle" style={{ fontSize: 12, marginBottom: 8 }}>Υπόλοιπο ημέρας</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div className="hero-stat" style={{ padding: "10px 14px", minWidth: 100, textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: getRemainingColor() }}>{formatNumber(remainingCalories)}</div>
              <div className="hero-subtle" style={{ fontSize: 11, marginTop: 3 }}>kcal</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>=</div>
            <div className="hero-stat" style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "8px" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(targetCalories)}</div>
              <div className="hero-subtle" style={{ fontSize: 10, marginTop: 2 }}>Στόχος</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, flexShrink: 0 }}>−</div>
            <div className="hero-stat" style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "8px" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(totalCalories)}</div>
              <div className="hero-subtle" style={{ fontSize: 10, marginTop: 2 }}>Φαγητό</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, flexShrink: 0 }}>+</div>
            <div className="hero-stat" style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "8px" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(exerciseValue)}</div>
              <div className="hero-subtle" style={{ fontSize: 10, marginTop: 2 }}>Άσκηση</div>
            </div>
          </div>
        </div>
        <div className="progress-outer"><div className="progress-inner" style={{ width: `${progress}%` }} /></div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.08)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ color: "white", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>🎯 {getGoalLabel()} · {getModeLabel()}</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 }}>{getModeHint()}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>Protein υπόλοιπο: <strong style={{ color: "white" }}>{formatNumber(remainingProtein)}g</strong></span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>{formatNumber(totalCalories)}/{formatNumber(targetCalories)} kcal</span>
          </div>
        </div>
      </div>

      {/* 2. MACROS */}
      <div className="card">
        <h2>Macros σήμερα</h2>
        <div className="macro-bars">
          <div className="macro-bar-row">
            <div className="macro-bar-label"><span className="macro-bar-title">Πρωτεΐνη</span><span className="macro-bar-value">{formatNumber(totalProtein)}g / {formatNumber(macroTargets?.proteinGrams || 0)}g</span></div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-protein" style={{ width: `${proteinPercent}%` }} /></div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label"><span className="macro-bar-title">Υδατάνθρακες</span><span className="macro-bar-value">{formatNumber(totalCarbs)}g / {formatNumber(macroTargets?.carbsGrams || 0)}g</span></div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-carbs" style={{ width: `${carbsPercent}%` }} /></div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label"><span className="macro-bar-title">Λίπος</span><span className="macro-bar-value">{formatNumber(totalFat)}g / {formatNumber(macroTargets?.fatGrams || 0)}g</span></div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-fat" style={{ width: `${fatPercent}%` }} /></div>
          </div>
        </div>
      </div>

      {/* 3. AI COACH */}
      <AiCoach
        last7Days={last7Days} dailyLogs={dailyLogs} targetCalories={targetCalories}
        proteinTarget={proteinTarget} mode={mode} goalType={goalType} streak={streak}
        weightLog={weightLog} favoriteFoods={favoriteFoods} foods={foods}
        totalCalories={totalCalories} totalProtein={totalProtein} exerciseValue={exerciseValue}
        remainingCalories={remainingCalories} favoriteFoodsText={favoriteFoodsText}
        favoriteExercisesText={favoriteExercisesText} favoriteExercises={favoriteExercises}
        age={age} weight={weight} height={height} gender={gender}
        savedPlans={savedPlans} onSavePlan={onSavePlan}
      />

      {/* 4. ΠΡΟΓΡΑΜΜΑΤΑ */}
      <div className="card">
        <h2>📋 Τα προγράμματά μου</h2>
        <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          Γενικές προτάσεις — δεν αντικαθιστούν ειδικό. Συμβουλέψου γιατρό αν έχεις παθήσεις ή αλλεργίες.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PlanSection plan={mealPlan} type="meal" emoji="🥗" title="Πρόγραμμα διατροφής" />
          <div style={{ height: 1, background: "var(--border-soft)" }} />
          <PlanSection plan={trainingPlan} type="training" emoji="💪" title="Πρόγραμμα γυμναστικής" />
        </div>
      </div>

      {/* 5. ΠΡΟΟΔΟΣ */}
      <div className="card">
        <h2>Πρόοδος</h2>

        {/* Εισαγωγή βάρους — collapsible */}
        <button className="btn btn-light" onClick={() => setShowWeightInput(!showWeightInput)} type="button"
          style={{ width: "100%", marginBottom: showWeightInput ? 10 : 12, fontSize: 12 }}>
          {showWeightInput ? "⚖️ Εισαγωγή βάρους ▲" : "⚖️ Εισαγωγή βάρους ▼"}
        </button>
        {showWeightInput && (
          <div style={{ marginBottom: 12 }}>
            {lastWeight && (
              <div style={{ display: "flex", gap: 12, marginBottom: 10, background: "var(--bg-soft)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border-soft)" }}>
                <div>
                  <div className="muted" style={{ fontSize: 11 }}>Τελευταίο</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{lastWeight} kg</div>
                </div>
                {diff !== null && (
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>30 μέρες</div>
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
              <input className="input" type="date" value={weightDate}
                onChange={(e) => setWeightDate(e.target.value)}
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
              {showWeightHistory ? "Απόκρυψη ιστορικού ▲" : `Ιστορικό βάρους (${sortedWeightLog.length}) ▼`}
            </button>
            {showWeightHistory && (
              <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 8 }}>
                {sortedWeightLog.slice(0, 10).map((entry) => (
                  <div key={entry.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
                    <span className="muted">{formatDisplayDate(entry.date)}</span>
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
            {showWeightChart ? "Απόκρυψη γραφήματος ▲" : "Εμφάνιση γραφήματος ▼"}
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
            <div style={{ fontWeight: 700, fontSize: 14 }}>Streak {getStreakEmoji(streak)}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Συνεχόμενες μέρες στο στόχο</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 28, lineHeight: 1 }}>
            {streak}<span className="muted" style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>μέρες</span>
          </div>
        </div>
      </div>

      {/* 6. ΙΣΤΟΡΙΚΟ */}
      <div className="card">
        <h2>Τελευταίες 7 ημέρες</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {last7Days.map((day) => (
            <button key={day.date} onClick={() => setSelectedDate(day.date)} type="button"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: day.date === selectedDate ? "var(--color-accent)" : "var(--bg-soft)", color: day.date === selectedDate ? "var(--bg-card)" : "var(--text-primary)", borderRadius: 10, border: `1px solid ${day.date === selectedDate ? "var(--color-accent)" : "var(--border-soft)"}`, cursor: "pointer", textAlign: "left", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{formatDisplayDate(day.date)}</span>
              <span style={{ fontSize: 12, opacity: day.date === selectedDate ? 0.85 : 1 }}
                className={day.date === selectedDate ? "" : day.remaining >= 0 ? "summary-history-remaining-positive" : "summary-history-remaining-negative"}>
                {formatNumber(day.eaten)} kcal · {day.remaining >= 0 ? "+" : ""}{formatNumber(day.remaining)} υπόλοιπο
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}