import { EXERCISE_LIBRARY } from "../../data/constants";
import { formatNumber } from "../../utils/helpers";
import GoogleFitButton from "../GoogleFitButton";

export default function ExerciseTab({
  exercises,
  exerciseValue,
  exerciseMinutes,
  setExerciseMinutes,
  customExerciseName,
  setCustomExerciseName,
  customExerciseMinutes,
  setCustomExerciseMinutes,
  customExerciseRate,
  setCustomExerciseRate,
  addExerciseByMinutes,
  addCustomExercise,
  deleteExercise,
  selectedDate,
  updateCurrentDay
}) {
  function handleAddFromFit(exercise) {
    updateCurrentDay((current) => ({
      ...current,
      exercises: [exercise, ...current.exercises]
    }));
  }

  return (
    <>
      <div className="card">
        <h2>Άσκηση ημέρας</h2>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span className="muted">Σύνολο σήμερα</span>
          <span style={{ fontWeight: 800, color: "#166534" }}>+{formatNumber(exerciseValue)} kcal</span>
        </div>

        {exercises.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Δεν έχεις βάλει άσκηση.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {exercises.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-soft)", borderRadius: 10, border: "1px solid var(--border-soft)", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {item.minutes > 0 ? `${item.minutes} λεπτά · ` : ""}+{formatNumber(item.calories)} kcal
                  </div>
                </div>
                <button
                  className="btn btn-light"
                  onClick={() => deleteExercise(item.id)}
                  type="button"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <GoogleFitButton
          selectedDate={selectedDate}
          onAddExercise={handleAddFromFit}
        />
      </div>

      <div className="card">
        <h2>Προσθήκη άσκησης</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {EXERCISE_LIBRARY.map((exercise) => (
            <div key={exercise.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-soft)", borderRadius: 10, border: "1px solid var(--border-soft)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{exercise.name}</span>
                <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{formatNumber(exercise.caloriesPerMinute)} kcal/λεπτό</span>
              </div>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="λεπτά"
                value={exerciseMinutes[exercise.name] || ""}
                onChange={(e) =>
                  setExerciseMinutes((prev) => ({ ...prev, [exercise.name]: e.target.value }))
                }
                style={{ width: 70, padding: "6px 8px", fontSize: 13, textAlign: "center" }}
              />
              <button
                className="btn btn-dark"
                onClick={() => addExerciseByMinutes(exercise, exerciseMinutes[exercise.name])}
                type="button"
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Custom άσκηση</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            className="input"
            placeholder="Όνομα άσκησης"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="Λεπτά"
              inputMode="numeric"
              value={customExerciseMinutes}
              onChange={(e) => setCustomExerciseMinutes(e.target.value)}
            />
            <input
              className="input"
              placeholder="kcal/λεπτό"
              inputMode="decimal"
              value={customExerciseRate}
              onChange={(e) => setCustomExerciseRate(e.target.value)}
            />
          </div>
          <button className="btn btn-dark" onClick={addCustomExercise} type="button">
            Προσθήκη
          </button>
        </div>
      </div>
    </>
  );
}