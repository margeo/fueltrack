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
        <div className="row wrap" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Άσκηση ημέρας</h2>
          <div className="soft-box" style={{ padding: "8px 12px" }}>
            +{formatNumber(exerciseValue)} kcal
          </div>
        </div>

        {exercises.length === 0 ? (
          <div className="muted">Δεν έχεις βάλει άσκηση για αυτή την ημέρα.</div>
        ) : (
          <div className="stack-10">
            {exercises.map((item) => (
              <div key={item.id} className="exercise-list-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div className="muted">
                    {item.minutes} λεπτά · {item.caloriesPerMinute} kcal/λεπτό · +
                    {formatNumber(item.calories)} kcal
                  </div>
                </div>

                <button className="btn btn-danger" onClick={() => deleteExercise(item.id)}>
                  Χ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Προσθήκη άσκησης με λεπτά</h2>
        <div className="muted" style={{ marginBottom: 12 }}>
          Βάζεις λεπτά και το app υπολογίζει αυτόματα τις θερμίδες.
        </div>

        <div className="grid-2">
          {EXERCISE_LIBRARY.map((exercise) => (
            <div key={exercise.name} className="soft-box">
              <div style={{ fontWeight: 700 }}>{exercise.name}</div>
              <div className="muted" style={{ marginBottom: 10 }}>
                {exercise.caloriesPerMinute} kcal / λεπτό
              </div>

              <div className="stack-10">
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="Λεπτά"
                  value={exerciseMinutes[exercise.name] || ""}
                  onChange={(e) =>
                    setExerciseMinutes((prev) => ({
                      ...prev,
                      [exercise.name]: e.target.value
                    }))
                  }
                />
                <button
                  className="btn btn-dark"
                  onClick={() => addExerciseByMinutes(exercise, exerciseMinutes[exercise.name])}
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
            <input
              className="input"
              placeholder="Λεπτά"
              inputMode="numeric"
              value={customExerciseMinutes}
              onChange={(e) => setCustomExerciseMinutes(e.target.value)}
            />
            <input
              className="input"
              placeholder="kcal / λεπτό"
              inputMode="decimal"
              value={customExerciseRate}
              onChange={(e) => setCustomExerciseRate(e.target.value)}
            />
          </div>

          <button className="btn btn-dark" onClick={addCustomExercise}>
            Προσθήκη custom άσκησης
          </button>
        </div>
      </div>
    </>
  );
}