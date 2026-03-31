import { useMemo, useState } from "react";
import { formatDisplayDate, formatNumber } from "../../utils/helpers";
import { calculateStreak, getStreakEmoji, getStreakMessage } from "../../utils/streak";

export default function SummaryTab({
  selectedDate,
  setSelectedDate,
  isToday,
  targetCalories,
  totalCalories,
  exerciseValue,
  remainingCalories,
  progress,
  goalType,
  last7Days,
  proteinTarget,
  totalProtein,
  totalCarbs,
  totalFat,
  mode,
  macroTargets,
  foods,
  dailyLogs,
  weightLog,
  onAddWeight,
  onDeleteWeight
}) {
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));

  const streak = useMemo(
    () => calculateStreak(dailyLogs, targetCalories),
    [dailyLogs, targetCalories]
  );

  const sortedWeightLog = useMemo(() => {
    return [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [weightLog]);

  const chartData = useMemo(() => {
    return [...(weightLog || [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [weightLog]);

  const firstWeight = chartData[0]?.weight;
  const lastWeight = chartData[chartData.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : null;

  const minW = chartData.length ? Math.min(...chartData.map((d) => d.weight)) - 1 : 0;
  const maxW = chartData.length ? Math.max(...chartData.map((d) => d.weight)) + 1 : 1;
  const range = maxW - minW || 1;
  const chartH = 160;
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
    if (mode === "low_carb") return "Σήμερα δώσε έμφαση σε πρωτεΐνη και πιο χαμηλούς υδατάνθρακες.";
    if (mode === "keto") return "Σήμερα κράτα πολύ χαμηλά τους υδατάνθρακες και προτίμησε πιο keto-friendly επιλογές.";
    if (mode === "fasting") return "Σήμερα ο τρόπος διατροφής σου είναι fasting, άρα έχει σημασία και το timing των γευμάτων.";
    if (mode === "high_protein") return "Σήμερα δώσε έμφαση στην πρωτεΐνη ώστε να πλησιάσεις τον στόχο σου.";
    return "Σήμερα στόχευσε σε ισορροπημένη πρόσληψη θερμίδων και πρωτεΐνης.";
  }

  function getSuggestionReason(food) {
    const protein = Number(food.proteinPer100g || 0);
    const carbs = Number(food.carbsPer100g || 0);
    if (mode === "high_protein" && protein >= 18) return "Καλή επιλογή για υψηλή πρωτεΐνη.";
    if (mode === "low_carb" && carbs <= 12) return "Ταιριάζει σε low carb λογική.";
    if (mode === "keto" && carbs <= 8) return "Πιο κοντά σε keto επιλογή.";
    if (mode === "fasting") return "Καλή επιλογή για πιο χορταστικό γεύμα όταν ανοίγει το eating window.";
    return "Καλή πρακτική επιλογή για σήμερα.";
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

        let aScore = 0;
        let bScore = 0;

        if (remainingProtein > 15) {
          aScore += aProtein * 3;
          bScore += bProtein * 3;
        } else {
          aScore += aProtein * 1.5;
          bScore += bProtein * 1.5;
        }

        if (mode === "high_protein") { aScore += aProtein * 2; bScore += bProtein * 2; }
        if (mode === "low_carb") { aScore -= aCarbs * 2; bScore -= bCarbs * 2; }
        if (mode === "keto") { aScore -= aCarbs * 4; bScore -= bCarbs * 4; }

        aScore -= aCalories * 0.03;
        bScore -= bCalories * 0.03;

        return bScore - aScore;
      })
      .slice(0, 5);
  }

  const suggestions = getSuggestedFoods();
  const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);

  const proteinPercent = macroTargets?.proteinGrams
    ? Math.min((totalProtein / macroTargets.proteinGrams) * 100, 100)
    : 0;
  const carbsPercent = macroTargets?.carbsGrams
    ? Math.min((totalCarbs / macroTargets.carbsGrams) * 100, 100)
    : 0;
  const fatPercent = macroTargets?.fatGrams
    ? Math.min((totalFat / macroTargets.fatGrams) * 100, 100)
    : 0;

  return (
    <>
      {/* HERO CARD */}
      <div className="hero-card">
        <div className="summary-date-row">
          <div>
            <div className="hero-subtle">Επιλεγμένη ημέρα</div>
            <div className="summary-date-title">{formatDisplayDate(selectedDate)}</div>
            <div className="hero-subtle">{selectedDate}</div>
          </div>
          <div className="summary-date-controls">
            <button
              className="btn btn-light"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              type="button"
            >
              {isToday ? "Σήμερα ✓" : "Σήμερα"}
            </button>
            <input
              className="input summary-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="summary-remaining-block">
          <div className="hero-subtle">Υπόλοιπο ημέρας</div>
          <div className={`hero-big ${getRemainingClassName()}`}>
            {formatNumber(remainingCalories)} kcal
          </div>
          <div className="hero-subtle summary-remaining-formula">
            Υπόλοιπο = Στόχος - Φαγητό + Άσκηση
          </div>
        </div>

        <div className="hero-grid summary-hero-grid">
          <div className="hero-stat">
            <div className="hero-subtle">Στόχος</div>
            <div>{formatNumber(targetCalories)} kcal</div>
          </div>
          <div className="hero-stat">
            <div className="hero-subtle">Φαγητό</div>
            <div>{formatNumber(totalCalories)} kcal</div>
          </div>
          <div className="hero-stat">
            <div className="hero-subtle">Άσκηση</div>
            <div>+{formatNumber(exerciseValue)} kcal</div>
          </div>
          <div className="hero-stat">
            <div className="hero-subtle">Υπόλοιπο</div>
            <div>{formatNumber(remainingCalories)} kcal</div>
          </div>
        </div>

        <div className="hero-grid summary-hero-grid-2">
          <div className="hero-stat">
            <div className="hero-subtle">Στόχος</div>
            <div>{getGoalLabel()}</div>
          </div>
          <div className="hero-stat">
            <div className="hero-subtle">Τρόπος διατροφής</div>
            <div>{getModeLabel()}</div>
          </div>
        </div>

        <div className="progress-outer">
          <div className="progress-inner" style={{ width: `${progress}%` }} />
        </div>
        <div className="hero-subtle summary-progress-text">
          {formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal από το φαγητό
        </div>
      </div>

      {/* MACRO PROGRESS BARS */}
      <div className="card">
        <h2>Macros σήμερα</h2>
        <div className="macro-bars">
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Πρωτεΐνη</span>
              <span className="macro-bar-value">
                {formatNumber(totalProtein)}g / {formatNumber(macroTargets?.proteinGrams || 0)}g
              </span>
            </div>
            <div className="macro-bar-outer">
              <div
                className="macro-bar-inner macro-bar-protein"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
          </div>

          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Υδατάνθρακες</span>
              <span className="macro-bar-value">
                {formatNumber(totalCarbs)}g / {formatNumber(macroTargets?.carbsGrams || 0)}g
              </span>
            </div>
            <div className="macro-bar-outer">
              <div
                className="macro-bar-inner macro-bar-carbs"
                style={{ width: `${carbsPercent}%` }}
              />
            </div>
          </div>

          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Λίπος</span>
              <span className="macro-bar-value">
                {formatNumber(totalFat)}g / {formatNumber(macroTargets?.fatGrams || 0)}g
              </span>
            </div>
            <div className="macro-bar-outer">
              <div
                className="macro-bar-inner macro-bar-fat"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* STREAK */}
      <div className="card">
        <h2>Streak {getStreakEmoji(streak)}</h2>
        <div className="soft-box">
          <div style={{ fontSize: 36, fontWeight: 800 }}>{streak} μέρες</div>
          <div className="muted" style={{ marginTop: 6 }}>{getStreakMessage(streak)}</div>
        </div>
      </div>

      {/* WEIGHT TRACKING */}
      <div className="card">
        <h2>⚖️ Βάρος</h2>
        <div className="soft-box">
          <div className="grid-2">
            <label className="profile-field">
              <div className="profile-label">Βάρος (kg)</div>
              <input
                className="input"
                type="number"
                step="0.1"
                placeholder="π.χ. 82.5"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
            </label>
            <label className="profile-field">
              <div className="profile-label">Ημερομηνία</div>
              <input
                className="input"
                type="date"
                value={weightDate}
                onChange={(e) => setWeightDate(e.target.value)}
              />
            </label>
          </div>
          <div className="action-row" style={{ marginTop: 12 }}>
            <button className="btn btn-dark" onClick={handleAddWeight} type="button">
              Αποθήκευση
            </button>
          </div>
        </div>

        {chartData.length >= 2 && (
          <div className="soft-box" style={{ marginTop: 10, overflowX: "auto" }}>
            <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ width: "100%", maxWidth: chartW }}>
              {chartData.map((point, i) => {
                const x = (i / (chartData.length - 1)) * (chartW - 20) + 10;
                const y = chartH - ((point.weight - minW) / range) * (chartH - 20) + 10;
                const next = chartData[i + 1];
                const nx = next ? ((i + 1) / (chartData.length - 1)) * (chartW - 20) + 10 : null;
                const ny = next ? chartH - ((next.weight - minW) / range) * (chartH - 20) + 10 : null;
                return (
                  <g key={point.date}>
                    {next && (
                      <line x1={x} y1={y} x2={nx} y2={ny} stroke="var(--color-accent, #111)" strokeWidth="2" />
                    )}
                    <circle cx={x} cy={y} r="4" fill="var(--color-accent, #111)" />
                    <text x={x} y={chartH + 18} textAnchor="middle" fontSize="8" fill="var(--color-muted, #888)">
                      {point.date.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
            {diff !== null && (
              <div style={{ marginTop: 8 }}>
                <span className="muted">Αλλαγή (30 μέρες): </span>
                <strong style={{ color: diff <= 0 ? "green" : "red" }}>
                  {diff > 0 ? "+" : ""}{formatNumber(Math.round(diff * 10) / 10)} kg
                </strong>
              </div>
            )}
          </div>
        )}

        {sortedWeightLog.length > 0 && (
          <div className="stack-10" style={{ marginTop: 10 }}>
            {sortedWeightLog.slice(0, 5).map((entry) => (
              <div key={entry.date} className="food-entry-card">
                <div className="food-entry-main">
                  <div className="food-entry-title">{formatDisplayDate(entry.date)}</div>
                  <div className="muted">{entry.date}</div>
                </div>
                <div className="food-entry-actions">
                  <div style={{ fontWeight: 700 }}>{entry.weight} kg</div>
                  <button
                    className="btn btn-light"
                    onClick={() => onDeleteWeight(entry.date)}
                    type="button"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ΚΑΤΕΥΘΥΝΣΗ ΗΜΕΡΑΣ */}
      <div className="card">
        <h2>Κατεύθυνση ημέρας</h2>
        <div className="soft-box">
          <div className="summary-section-title">Σήμερα δουλεύεις με {getModeLabel()}</div>
          <div className="muted summary-mode-hint">{getModeHint()}</div>
          <div className="stack-10">
            <div>
              <span className="muted">Θερμίδες που μένουν:</span>{" "}
              <strong>{formatNumber(remainingCalories)} kcal</strong>
            </div>
            <div>
              <span className="muted">Πρωτεΐνη που μένει:</span>{" "}
              <strong>{formatNumber(remainingProtein)} g</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ΠΡΟΤΑΣΕΙΣ */}
      <div className="card">
        <h2>Τι να φας τώρα</h2>
        {suggestions.length === 0 ? (
          <div className="soft-box">
            <div className="muted">Δεν βρέθηκαν προτάσεις για το τωρινό υπόλοιπο.</div>
          </div>
        ) : (
          <div className="summary-suggestions-list">
            {suggestions.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} className="summary-suggestion-card">
                <div className="summary-suggestion-top">
                  <div className="summary-suggestion-title">
                    {food.name}{food.brand ? ` · ${food.brand}` : ""}
                  </div>
                  <div className="muted">{formatNumber(food.caloriesPer100g || 0)} kcal / 100g</div>
                </div>
                <div className="muted summary-suggestion-meta">
                  Πρωτεΐνη {formatNumber(food.proteinPer100g || 0)}g · Υδατ.{" "}
                  {formatNumber(food.carbsPer100g || 0)}g · Λίπος{" "}
                  {formatNumber(food.fatPer100g || 0)}g
                </div>
                <div className="muted">{getSuggestionReason(food)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ΙΣΤΟΡΙΚΟ 7 ΗΜΕΡΩΝ */}
      <div className="card">
        <h2>Τελευταίες 7 ημέρες</h2>
        <div className="summary-history-list">
          {last7Days.map((day) => (
            <button
              key={day.date}
              className={`history-row summary-history-row ${day.date === selectedDate ? "summary-history-row-active" : ""}`}
              onClick={() => setSelectedDate(day.date)}
              type="button"
            >
              <div className="summary-history-main">
                <div>
                  <div className="summary-history-title">{formatDisplayDate(day.date)}</div>
                  <div className="muted">{day.date}</div>
                </div>
                <div className="summary-history-stats">
                  <div className="muted">Φαγητό: {formatNumber(day.eaten)} kcal</div>
                  <div className="muted">Άσκηση: +{formatNumber(day.exercise)} kcal</div>
                  <div className={day.remaining >= 0 ? "summary-history-remaining-positive" : "summary-history-remaining-negative"}>
                    Υπόλοιπο: {formatNumber(day.remaining)} kcal
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}