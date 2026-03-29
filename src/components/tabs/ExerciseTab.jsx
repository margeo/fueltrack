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

        <div className="soft-box" style={{ marginTop: 10 }}>
          <div className="row wrap" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>Σύνοψη ημέρας</div>
            <div className="muted">+{formatNumber(exerciseValue)} kcal</div>
          </div>

          {exercises.length === 0 ? (
            <div className="muted">Δεν έχεις βάλει άσκηση για αυτή την ημέρα.</div>
          ) : (
            <div className="stack-10">
              {exercises.map((item) => (
                <div
                  key={item.id}
                  className="soft-box"
                  style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}
                >
                  <div className="row wrap" style={{ gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        {item.minutes} λεπτά · {formatNumber(item.caloriesPerMinute)} kcal/λεπτό · +
                        {formatNumber(item.calories)} kcal
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-light" type="button">
                        Edit
                      </button>

                      <button
                        className="btn btn-light"
                        onClick={() => deleteExercise(item.id)}
                        type="button"
                      >
                        X
                      </button>
                    </div>
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

        <div className="stack-10">
          {EXERCISE_LIBRARY.map((exercise) => (
            <div
              key={exercise.name}
              className="soft-box"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap"
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700 }}>{exercise.name}</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {formatNumber(exercise.caloriesPerMinute)} kcal / λεπτό
                </div>
              </div>

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
                style={{ width: 110, marginBottom: 0 }}
              />

              <button
                className="btn btn-dark"
                onClick={() => addExerciseByMinutes(exercise, exerciseMinutes[exercise.name])}
                type="button"
              >
                Προσθήκη
              </button>
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

          <button className="btn btn-dark" onClick={addCustomExercise} type="button">
            Προσθήκη custom άσκησης
          </button>
        </div>
      </div>
    </>
  );
}