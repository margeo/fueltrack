import { useMemo, useState } from "react";
import { formatDisplayDate, formatNumber } from "../../utils/helpers";
import { calculateStreak, getStreakEmoji } from "../../utils/streak";
import AiCoach from "../AiCoach";

export default function SummaryTab({
  selectedDate, setSelectedDate, isToday,
  targetCalories, totalCalories, exerciseValue,
  remainingCalories, progress, goalType,
  last7Days, proteinTarget, totalProtein,
  totalCarbs, totalFat, mode, macroTargets,
  foods, dailyLogs, weightLog,
  onAddWeight, onDeleteWeight,
  favoriteFoods, favoriteFoodsText, favoriteExercisesText
}) {
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAllWeight, setShowAllWeight] = useState(false);

  const streak = useMemo(() => calculateStreak(dailyLogs, targetCalories), [dailyLogs, targetCalories]);

  const sortedWeightLog = useMemo(() => {
    return [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [weightLog]);

  const chartData = useMemo(() => {
    return [...(weightLog || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [weightLog]);

  const firstWeight = chartData[0]?.weight;
  const lastWeight = chartData[chartData.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : null;

  const minW = chartData.length ? Math.min(...chartData.map((d) => d.weight)) - 1 : 0;
  const maxW = chartData.length ? Math.max(...chartData.map((d) => d.weight)) + 1 : 1;
  const range = maxW - minW || 1;
  const chartH = 100;
  const chartW = 300;

  function handleAddWeight() {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    onAddWeight({ date: weightDate, weight: w });
    setWeightInput("");
  }

  function getGoalLabel() {
    if (goalType === "lose") return "Lose weight";
    if (goalType === "gain") return "Muscle gain";
    return "Maintain";
  }

  function getModeLabel() {
    if (mode === "low_carb") return "Low Carb";
    if (mode === "keto") return "Keto";
    if (mode === "fasting") return "Fasting 16:8";
    if (mode === "high_protein") return "High Protein";
    return "Balanced";
  }

  function getRemainingClassName() {
    if (remainingCalories > 100) return "summary-remaining-positive";
    if (remainingCalories < -150) return "summary-remaining-negative";
    return "summary-remaining-neutral";
  }

  function getModeHint() {
    if (mode === "low_carb") return "Δώσε έμφαση σε πρωτεΐνη και χαμηλούς υδατάνθρακες.";
    if (mode === "keto") return "Κράτα τους υδατάνθρακες πολύ χαμηλά.";
    if (mode === "fasting") return "Έχει σημασία και το timing των γευμάτων.";
    if (mode === "high_protein") return "Δώσε έμφαση στην πρωτεΐνη.";
    return "Στόχευσε σε ισορροπημένη πρόσληψη θερμίδων.";
  }

  function getSuggestionReason(food) {
    const protein = Number(food.proteinPer100g || 0);
    const carbs = Number(food.carbsPer100g || 0);
    if (mode === "high_protein" && protein >= 18) return "Υψηλή πρωτεΐνη";
    if (mode === "low_carb" && carbs <= 12) return "Low carb";
    if (mode === "keto" && carbs <= 8) return "Keto friendly";
    if (mode === "fasting") return "Χορταστικό";
    return "Καλή επιλογή";
  }

  function getSuggestedFoods() {
    if (!Array.isArray(foods) || foods.length === 0) return [];
    const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);
    return foods
      .filter((food) => Number(food.caloriesPer100g || 0) > 0)
      .filter((food) => Number(food.caloriesPer100g || 0) <= Math.max(remainingCalories, 250) + 120)
      .filter((food) => {
        const carbs = Number(food.carbsPer100g || 0);
        if (mode === "keto") return carbs <= 8;
        if (mode === "low_carb") return carbs <= 15;
        return true;
      })
      .sort((a, b) => {
        const aProtein = Number(a.proteinPer100g || 0);
        const bProtein = Number(b.proteinPer100g || 0);
        const aCalories = Number(a.caloriesPer100g || 0);
        const bCalories = Number(b.caloriesPer100g || 0);
        const aCarbs = Number(a.carbsPer100g || 0);
        const bCarbs = Number(b.carbsPer100g || 0);
        let aScore = 0; let bScore = 0;
        if (remainingProtein > 15) { aScore += aProtein * 3; bScore += bProtein * 3; }
        else { aScore += aProtein * 1.5; bScore += bProtein * 1.5; }
        if (mode === "high_protein") { aScore += aProtein * 2; bScore += bProtein * 2; }
        if (mode === "low_carb") { aScore -= aCarbs * 2; bScore -= bCarbs * 2; }
        if (mode === "keto") { aScore -= aCarbs * 4; bScore -= bCarbs * 4; }
        aScore -= aCalories * 0.03; bScore -= bCalories * 0.03;
        return bScore - aScore;
      })
      .slice(0, 5);
  }

  const suggestions = getSuggestedFoods();
  const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);

  const proteinPercent = macroTargets?.proteinGrams ? Math.min((totalProtein / macroTargets.proteinGrams) * 100, 100) : 0;
  const carbsPercent = macroTargets?.carbsGrams ? Math.min((totalCarbs / macroTargets.carbsGrams) * 100, 100) : 0;
  const fatPercent = macroTargets?.fatGrams ? Math.min((totalFat / macroTargets.fatGrams) * 100, 100) : 0;

  return (
    <>
      {/* HERO CARD */}
      <div className="hero-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {formatDisplayDate(selectedDate)}
            {isToday && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>· Σήμερα</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!isToday && (
              <button className="btn btn-light" onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))} type="button" style={{ fontSize: 12, padding: "6px 10px" }}>Σήμερα</button>
            )}
            <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: 140, padding: "6px 8px", fontSize: 12 }} />
          </div>
        </div>

        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <div className="hero-subtle" style={{ fontSize: 12 }}>Υπόλοιπο ημέρας</div>
          <div className={`hero-big ${getRemainingClassName()}`} style={{ fontSize: 36, fontWeight: 800 }}>
            {formatNumber(remainingCalories)} kcal
          </div>
          <div className="hero-subtle" style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
            = {formatNumber(targetCalories)} − {formatNumber(totalCalories)} + {formatNumber(exerciseValue)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12, marginTop: 12 }}>
          <div className="hero-stat" style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
            <div className="hero-subtle" style={{ fontSize: 11 }}>Στόχος</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(targetCalories)}</div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}>−</div>
          <div className="hero-stat" style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
            <div className="hero-subtle" style={{ fontSize: 11 }}>Φαγητό</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(totalCalories)}</div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}>+</div>
          <div className="hero-stat" style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
            <div className="hero-subtle" style={{ fontSize: 11 }}>Άσκηση</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(exerciseValue)}</div>
          </div>
        </div>

        <div className="progress-outer">
          <div className="progress-inner" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <div className="hero-subtle" style={{ fontSize: 11 }}>{getGoalLabel()} · {getModeLabel()}</div>
          <div className="hero-subtle" style={{ fontSize: 11 }}>{formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal</div>
        </div>
      </div>

      {/* MACROS */}
      <div className="card">
        <h2>Macros</h2>
        <div className="macro-bars">
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Πρωτεΐνη</span>
              <span className="macro-bar-value">{formatNumber(totalProtein)}g / {formatNumber(macroTargets?.proteinGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner macro-bar-protein" style={{ width: `${proteinPercent}%` }} />
            </div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Υδατάνθρακες</span>
              <span className="macro-bar-value">{formatNumber(totalCarbs)}g / {formatNumber(macroTargets?.carbsGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner macro-bar-carbs" style={{ width: `${carbsPercent}%` }} />
            </div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Λίπος</span>
              <span className="macro-bar-value">{formatNumber(totalFat)}g / {formatNumber(macroTargets?.fatGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner macro-bar-fat" style={{ width: `${fatPercent}%` }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-soft)", borderRadius: 12, border: "1px solid var(--border-soft)" }}>
          <div style={{ fontWeight: 700 }}>Streak {getStreakEmoji(streak)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 20 }}>{streak}</span>
            <span className="muted">μέρες</span>
          </div>
        </div>
      </div>

      {/* AI COACH */}
      <AiCoach
        last7Days={last7Days}
        dailyLogs={dailyLogs}
        targetCalories={targetCalories}
        proteinTarget={proteinTarget}
        mode={mode}
        goalType={goalType}
        streak={streak}
        weightLog={weightLog}
        favoriteFoods={favoriteFoods}
        totalCalories={totalCalories}
        totalProtein={totalProtein}
        exerciseValue={exerciseValue}
        remainingCalories={remainingCalories}
        favoriteFoodsText={favoriteFoodsText}
        favoriteExercisesText={favoriteExercisesText}
      />

      {/* WEIGHT TRACKING */}
      <div className="card">
        <h2>⚖️ Προσθήκη βάρους</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input className="input" type="number" step="0.1" placeholder="kg" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} style={{ flex: 1 }} />
          <input className="input" type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-dark" onClick={handleAddWeight} type="button" style={{ flexShrink: 0, padding: "12px 16px" }}>+</button>
        </div>

        {chartData.length >= 2 && (
          <div style={{ marginBottom: 8, overflowX: "auto" }}>
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
                    {next && <line x1={x} y1={y} x2={nx} y2={ny} stroke="var(--color-accent, #111)" strokeWidth="1.5" />}
                    <circle cx={x} cy={y} r="3" fill="var(--color-accent, #111)" />
                    {showLabel && <text x={x} y={chartH + 14} textAnchor="middle" fontSize="7" fill="var(--text-muted, #888)">{point.date.slice(5)}</text>}
                  </g>
                );
              })}
            </svg>
            {diff !== null && (
              <div style={{ fontSize: 13 }}>
                <span className="muted">30 μέρες: </span>
                <strong style={{ color: diff <= 0 ? "green" : "red" }}>
                  {diff > 0 ? "+" : ""}{Math.round(diff * 10) / 10} kg
                </strong>
                {lastWeight && <span className="muted"> · Τώρα: {lastWeight} kg</span>}
              </div>
            )}
          </div>
        )}

        {sortedWeightLog.length > 0 && (
          <div>
            {(showAllWeight ? sortedWeightLog : sortedWeightLog.slice(0, 3)).map((entry) => (
              <div key={entry.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
                <span className="muted">{formatDisplayDate(entry.date)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{entry.weight} kg</span>
                  <button className="btn btn-light" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => onDeleteWeight(entry.date)} type="button">✕</button>
                </div>
              </div>
            ))}
            {sortedWeightLog.length > 3 && (
              <button className="btn btn-light" style={{ marginTop: 8, width: "100%", fontSize: 12 }} onClick={() => setShowAllWeight(!showAllWeight)} type="button">
                {showAllWeight ? "Λιγότερα ▲" : `+${sortedWeightLog.length - 3} ακόμα ▼`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ΚΑΤΕΥΘΥΝΣΗ + ΠΡΟΤΑΣΕΙΣ */}
      <div className="card">
        <h2>Κατεύθυνση ημέρας</h2>
        <div className="soft-box" style={{ padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{getModeLabel()} · {getModeHint()}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 13 }}>
            <span><span className="muted">Kcal: </span><strong>{formatNumber(remainingCalories)}</strong></span>
            <span><span className="muted">Protein: </span><strong>{formatNumber(remainingProtein)}g</strong></span>
          </div>
        </div>

        <h2 style={{ marginTop: 16 }}>Τι να φας τώρα</h2>
        {suggestions.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Δεν βρέθηκαν προτάσεις.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {suggestions.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-soft)", borderRadius: 10, border: "1px solid var(--border-soft)", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{food.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)} · {getSuggestionReason(food)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ΙΣΤΟΡΙΚΟ 7 ΗΜΕΡΩΝ */}
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