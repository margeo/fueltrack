import { formatDisplayDate, formatNumber } from "../../utils/helpers";
import SuggestionsBox from "../SuggestionsBox";

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
  mode,
  macroTargets,
  foods
}) {
  function getModeLabel() {
    if (mode === "low_carb") return "Low Carb";
    if (mode === "keto") return "Keto";
    if (mode === "fasting") return "Fasting";
    if (mode === "high_protein") return "High Protein";
    return "Balanced";
  }

  function getRemainingColor() {
    if (remainingCalories > 100) return "#86efac";
    if (remainingCalories < -150) return "#fca5a5";
    return "#fde68a";
  }

  return (
    <>
      <div className="hero-card">
        <div className="row wrap">
          <div>
            <div className="hero-subtle">Ημέρα</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {formatDisplayDate(selectedDate)}
            </div>
          </div>

          <div className="row">
            <button
              className="btn btn-light"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            >
              {isToday ? "Σήμερα ✓" : "Σήμερα"}
            </button>

            <input
              className="input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="hero-subtle">Υπόλοιπο</div>
          <div className="hero-big" style={{ color: getRemainingColor() }}>
            {formatNumber(remainingCalories)} kcal
          </div>

          <div className="hero-subtle">
            Υπόλοιπο = Στόχος - Φαγητό + Άσκηση
          </div>
        </div>

        <div className="hero-grid">
          <div className="hero-stat">
            <div className="hero-subtle">Στόχος</div>
            <div>{formatNumber(targetCalories)}</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Φαγητό</div>
            <div>{formatNumber(totalCalories)}</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Άσκηση</div>
            <div>+{formatNumber(exerciseValue)}</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Mode</div>
            <div>{getModeLabel()}</div>
          </div>
        </div>

        <div className="hero-grid" style={{ marginTop: 12 }}>
          <div className="hero-stat">
            <div className="hero-subtle">Protein</div>
            <div>{formatNumber(totalProtein)} / {formatNumber(proteinTarget)} g</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Carbs</div>
            <div>{macroTargets.carbsGrams} g</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Fat</div>
            <div>{macroTargets.fatGrams} g</div>
          </div>
        </div>

        <div className="progress-outer">
          <div className="progress-inner" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <SuggestionsBox
        foods={foods}
        mode={mode}
        remainingCalories={remainingCalories}
        remainingProtein={proteinTarget - totalProtein}
        onSelectFood={(food) => console.log(food)}
      />

      <div className="card">
        <h2>7 ημέρες</h2>

        {last7Days.map((day) => (
          <button
            key={day.date}
            className="history-row"
            onClick={() => setSelectedDate(day.date)}
          >
            <div className="row">
              <div>{formatDisplayDate(day.date)}</div>

              <div>
                {formatNumber(day.eaten)} kcal | Υπόλ. {formatNumber(day.remaining)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}