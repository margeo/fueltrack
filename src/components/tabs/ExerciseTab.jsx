import { EXERCISE_LIBRARY } from "../../data/constants";
import { formatNumber } from "../../utils/helpers";

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
  deleteExercise
}) {
  return (
    <>
      <div className="card">
        <h2>Άσκηση ημέρας</h2>

        <div className="soft-box exercise-summary-box">
          <div className="exercise-summary-head">
            <div style={{ fontWeight: 700 }}>Σύνοψη ημέρας</div>
            <div className="exercise-summary-kcal">
              +{formatNumber(exerciseValue)} kcal
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="muted">
              Δεν έχεις βάλει άσκηση για αυτή την ημέρα.
            </div>
          ) : (
            <div className="exercise-day-list">
              {exercises.map((item) => (
                <div key={item.id} className="exercise-entry-card">
                  <div className="exercise-entry-main">
                    <div className="exercise-entry-title">
                      {item.name}
                    </div>

                    <div className="muted exercise-entry-meta">
                      {item.minutes} λεπτά ·{" "}
                      {formatNumber(item.caloriesPerMinute)} kcal/λεπτό · +
                      {formatNumber(item.calories)} kcal
                    </div>
                  </div>

                  <div className="exercise-entry-actions">
                    <button
                      className="btn btn-light"
                      onClick={() => deleteExercise(item.id)}
                      type="button"
                    >
                      Διαγραφή
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Προσθήκη άσκησης με λεπτά</h2>

        <div className="muted" style={{ marginBottom: 12 }}>
          Βάζεις λεπτά και το app υπολογίζει αυτόματα τις θερμίδες.
        </div>

        <div className="exercise-library-list">
          {EXERCISE_LIBRARY.map((exercise) => (
            <div key={exercise.name} className="soft-box exercise-library-item">
              <div className="exercise-library-main">
                <div className="exercise-library-title">
                  {exercise.name}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {formatNumber(exercise.caloriesPerMinute)} kcal / λεπτό
                </div>
              </div>

              <div className="exercise-library-controls">
                <label className="exercise-inline-field">
                  <span className="exercise-inline-label">Λεπτά</span>
                  <input
                    className="input exercise-compact-input"
                    type="number"
                    min="1"
                    placeholder="0"
                    value={exerciseMinutes[exercise.name] || ""}
                    onChange={(e) =>
                      setExerciseMinutes((prev) => ({
                        ...prev,
                        [exercise.name]: e.target.value
                      }))
                    }
                  />
                </label>

                <button
                  className="btn btn-dark exercise-add-btn"
                  onClick={() =>
                    addExerciseByMinutes(
                      exercise,
                      exerciseMinutes[exercise.name]
                    )
                  }
                  type="button"
                >
                  Προσθήκη
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Custom άσκηση</h2>

        <div className="stack-10">
          <input
            className="input"
            placeholder="Όνομα άσκησης"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
          />

          <div className="grid-2">
            <label className="soft-box exercise-field-box">
              <div className="muted" style={{ marginBottom: 6 }}>
                Λεπτά
              </div>
              <input
                className="input"
                placeholder="Λεπτά"
                inputMode="numeric"
                value={customExerciseMinutes}
                onChange={(e) => setCustomExerciseMinutes(e.target.value)}
              />
            </label>

            <label className="soft-box exercise-field-box">
              <div className="muted" style={{ marginBottom: 6 }}>
                kcal / λεπτό
              </div>
              <input
                className="input"
                placeholder="kcal / λεπτό"
                inputMode="decimal"
                value={customExerciseRate}
                onChange={(e) => setCustomExerciseRate(e.target.value)}
              />
            </label>
          </div>

          <button
            className="btn btn-dark"
            onClick={addCustomExercise}
            type="button"
          >
            Προσθήκη custom άσκησης
          </button>
        </div>
      </div>
    </>
  );
}