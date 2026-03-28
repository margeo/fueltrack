import { formatDisplayDate, formatNumber } from "../../utils/helpers";

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
  totalProtein
}) {
  function getModeLabel() {
    if (goalType === "lose") return "Lose weight";
    if (goalType === "gain") return "Muscle gain";
    return "Maintain";
  }

  function getRemainingColor() {
    if (remainingCalories > 100) return "#86efac"; // πράσινο (έχεις χώρο)
    if (remainingCalories < -150) return "#fca5a5"; // κόκκινο (έχεις ξεφύγει)
    return "#fde68a"; // ουδέτερο
  }

  return (
    <>
      <div className="hero-card">
        <div className="row wrap">
          <div>
            <div className="hero-subtle">Επιλεγμένη ημέρα</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {formatDisplayDate(selectedDate)}
            </div>
            <div className="hero-subtle">{selectedDate}</div>
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
              style={{ width: 160, marginBottom: 0 }}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="hero-subtle">Υπόλοιπο ημέρας</div>
          <div className="hero-big" style={{ color: getRemainingColor() }}>
            {formatNumber(remainingCalories)} kcal
          </div>
        </div>

        <div className="hero-grid">
          <div className="hero-stat">
            <div className="hero-subtle">Στόχος</div>
            <div>{formatNumber(targetCalories)}</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Έφαγες</div>
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

        {/* 🔥 Protein tracking */}
        <div className="hero-grid" style={{ marginTop: 12 }}>
          <div className="hero-stat">
            <div className="hero-subtle">Protein στόχος</div>
            <div>{formatNumber(proteinTarget || 0)}g</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Protein intake</div>
            <div>{formatNumber(totalProtein || 0)}g</div>
          </div>
        </div>

        <div className="progress-outer">
          <div className="progress-inner" style={{ width: `${progress}%` }} />
        </div>

        <div className="hero-subtle" style={{ marginTop: 8 }}>
          {formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal
        </div>
      </div>

      <div className="card">
        <h2>Τελευταίες 7 ημέρες</h2>

        {last7Days.map((day) => (
          <button
            key={day.date}
            className="history-row"
            onClick={() => setSelectedDate(day.date)}
            style={{
              border:
                day.date === selectedDate
                  ? "2px solid #111827"
                  : "1px solid #e5e7eb"
            }}
          >
            <div className="row">
              <div>
                <div style={{ fontWeight: 700 }}>
                  {formatDisplayDate(day.date)}
                </div>
                <div className="muted">{day.date}</div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div className="muted">
                  🍽 {formatNumber(day.eaten)}
                </div>

                <div className="muted">
                  🏃 +{formatNumber(day.exercise)}
                </div>

                <div
                  style={{
                    color: day.remaining >= 0 ? "#166534" : "#b91c1c",
                    fontWeight: 700
                  }}
                >
                  Υπόλ. {formatNumber(day.remaining)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}