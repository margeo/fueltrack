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
  favoriteFoods, favoriteFoodsText, favoriteExercisesText,
  favoriteExercises,
  age, weight, height, gender,
  savedPlans, onSavePlan, onDeletePlan
}) {
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAllWeight, setShowAllWeight] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);

  const streak = useMemo(() => calculateStreak(dailyLogs, targetCalories), [dailyLogs, targetCalories]);

  const sortedWeightLog = useMemo(() =>
    [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [weightLog]
  );

  const chartData = useMemo(() =>
    [...(weightLog || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
    [weightLog]
  );

  const firstWeight = chartData[0]?.weight;
  const lastWeight = chartData[chartData.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : null;
  const minW = chartData.length ? Math.min(...chartData.map((d) => d.weight)) - 1 : 0;
  const maxW = chartData.length ? Math.max(...chartData.map((d) => d.weight)) + 1 : 1;
  const range = maxW - minW || 1;
  const chartH = 90, chartW = 300;

  function handleAddWeight() {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    onAddWeight({ date: weightDate, weight: w });
    setWeightInput("");
  }

  function getGoalLabel() {
    if (goalType === "lose") return "Lose weight";
    if (goalType === "gain") return "Muscle gain";
    if (goalType === "fitness") return "Fitness & Cardio";
    return "Maintain";
  }

  function getModeLabel() {
    const labels = {
      balanced: "Balanced", mediterranean: "Μεσογειακή", whole_foods: "Whole Foods",
      high_protein: "High Protein", muscle_gain: "Muscle Gain",
      low_carb: "Low Carb", keto: "Keto", carnivore: "Carnivore",
      fasting_16_8: "Fasting 16:8", fasting_18_6: "Fasting 18:6", omad: "OMAD",
      vegetarian: "Vegetarian", vegan: "Vegan"
    };
    return labels[mode] || "Balanced";
  }

  function getRemainingColor() {
    if (remainingCalories > 100) return "#86efac";
    if (remainingCalories < -150) return "#fca5a5";
    return "#fde68a";
  }

  function getModeHint() {
    const hints = {
      balanced: "Στόχευσε σε ισορροπημένη πρόσληψη θερμίδων.",
      mediterranean: "Βάσε σε ελαιόλαδο, ψάρι και λαχανικά.",
      whole_foods: "Μόνο φυσικές, ανεπεξέργαστες τροφές.",
      high_protein: "Κάθε γεύμα να έχει σημαντική πηγή πρωτεΐνης.",
      muscle_gain: "Caloric surplus + πρωτεΐνη γύρω από την προπόνηση.",
      low_carb: "Κράτα τους υδατάνθρακες κάτω από 15g/100g.",
      keto: "Κράτα τους υδατάνθρακες κάτω από 8g/100g.",
      carnivore: "Μόνο ζωικά προϊόντα.",
      fasting_16_8: "Φαγητό μόνο σε παράθυρο 8 ωρών.",
      fasting_18_6: "Φαγητό μόνο σε παράθυρο 6 ωρών.",
      omad: "Ένα γεύμα την ημέρα με όλες τις θερμίδες.",
      vegetarian: "Χωρίς κρέας — με αυγά και γαλακτοκομικά.",
      vegan: "Αποκλειστικά φυτική διατροφή."
    };
    return hints[mode] || hints.balanced;
  }

  const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);
  const proteinPercent = macroTargets?.proteinGrams ? Math.min((totalProtein / macroTargets.proteinGrams) * 100, 100) : 0;
  const carbsPercent = macroTargets?.carbsGrams ? Math.min((totalCarbs / macroTargets.carbsGrams) * 100, 100) : 0;
  const fatPercent = macroTargets?.fatGrams ? Math.min((totalFat / macroTargets.fatGrams) * 100, 100) : 0;

  return (
    <>
      {/* 1. HERO */}
      <div className="hero-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {formatDisplayDate(selectedDate)}
            {isToday && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>· Σήμερα</span>}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!isToday && (
              <button className="btn btn-light" onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))} type="button" style={{ fontSize: 12, padding: "6px 10px" }}>Σήμερα</button>
            )}
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
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <div className="hero-subtle" style={{ fontSize: 11 }}>{getGoalLabel()} · {getModeLabel()}</div>
          <div className="hero-subtle" style={{ fontSize: 11 }}>{formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal</div>
        </div>
      </div>

      {/* 2. MACROS */}
      <div className="card">
        <h2>Macros</h2>
        <div className="macro-bars">
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Πρωτεΐνη</span>
              <span className="macro-bar-value">{formatNumber(totalProtein)}g / {formatNumber(macroTargets?.proteinGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-protein" style={{ width: `${proteinPercent}%` }} /></div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Υδατάνθρακες</span>
              <span className="macro-bar-value">{formatNumber(totalCarbs)}g / {formatNumber(macroTargets?.carbsGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-carbs" style={{ width: `${carbsPercent}%` }} /></div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Λίπος</span>
              <span className="macro-bar-value">{formatNumber(totalFat)}g / {formatNumber(macroTargets?.fatGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-fat" style={{ width: `${fatPercent}%` }} /></div>
          </div>
        </div>
      </div>

      {/* 3. AI COACH */}
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
        foods={foods}
        totalCalories={totalCalories}
        totalProtein={totalProtein}
        exerciseValue={exerciseValue}
        remainingCalories={remainingCalories}
        favoriteFoodsText={favoriteFoodsText}
        favoriteExercisesText={favoriteExercisesText}
        favoriteExercises={favoriteExercises}
        age={age}
        weight={weight}
        height={height}
        gender={gender}
        savedPlans={savedPlans}
        onSavePlan={onSavePlan}
      />

      {/* 4. ΚΑΤΕΥΘΥΝΣΗ */}
      <div className="card">
        <h2>Κατεύθυνση ημέρας</h2>
        <div className="soft-box" style={{ padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{getModeLabel()} · {getModeHint()}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 13 }}>
            <span><span className="muted">Kcal: </span><strong>{formatNumber(remainingCalories)}</strong></span>
            <span><span className="muted">Protein: </span><strong>{formatNumber(remainingProtein)}g</strong></span>
          </div>
        </div>
      </div>

      {/* 5. ΑΠΟΘΗΚΕΥΜΕΝΑ ΠΡΟΓΡΑΜΜΑΤΑ */}
      {savedPlans?.length > 0 && (
        <div className="card">
          <h2>📋 Τα προγράμματά μου</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {savedPlans.map((plan) => (
              <div key={plan.type}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {plan.type === "meal" ? "🥗 Πρόγραμμα διατροφής" : "💪 Πρόγραμμα γυμναστικής"}
                    </span>
                    <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>{plan.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-light" onClick={() => setExpandedPlan(expandedPlan === plan.type ? null : plan.type)} type="button" style={{ fontSize: 11, padding: "3px 8px" }}>
                      {expandedPlan === plan.type ? "Σύμπτυξη ▲" : "Εμφάνιση ▼"}
                    </button>
                    <button className="btn btn-light" onClick={() => onDeletePlan(plan.type)} type="button" style={{ fontSize: 11, padding: "3px 8px" }}>✕</button>
                  </div>
                </div>
                {expandedPlan === plan.type && (
                  <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 400, overflowY: "auto", border: "1px solid var(--border-soft)", scrollbarWidth: "thin" }}>
                    {plan.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ΠΡΟΟΔΟΣ — Streak + Βάρος */}
      <div className="card">
        <h2>Πρόοδος</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-soft)", borderRadius: 12, border: "1px solid var(--border-soft)", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Streak {getStreakEmoji(streak)}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Συνεχόμενες μέρες στο στόχο</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 28, lineHeight: 1 }}>
            {streak}<span className="muted" style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>μέρες</span>
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⚖️ Εισαγωγή βάρους</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input className="input" type="number" step="0.1" placeholder="kg" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} style={{ flex: 1, padding: "10px 12px" }} />
          <input className="input" type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} style={{ flex: 1, padding: "10px 12px" }} />
          <button className="btn btn-dark" onClick={handleAddWeight} type="button" style={{ flexShrink: 0, padding: "10px 14px" }}>+</button>
        </div>

        {chartData.length >= 2 && (
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
            {diff !== null && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                <span className="muted">30 μέρες: </span>
                <strong style={{ color: diff <= 0 ? "#22c55e" : "#ef4444" }}>{diff > 0 ? "+" : ""}{Math.round(diff * 10) / 10} kg</strong>
                {lastWeight && <span className="muted"> · Τώρα: {lastWeight} kg</span>}
              </div>
            )}
          </div>
        )}

        {sortedWeightLog.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
            {(showAllWeight ? sortedWeightLog : sortedWeightLog.slice(0, 3)).map((entry) => (
              <div key={entry.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
                <span className="muted">{formatDisplayDate(entry.date)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{entry.weight} kg</span>
                  <button className="btn btn-light" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => onDeleteWeight(entry.date)} type="button">✕</button>
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

      {/* 7. ΙΣΤΟΡΙΚΟ 7 ΗΜΕΡΩΝ */}
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