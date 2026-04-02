import { useMemo, useState } from "react";
import { EXERCISE_LIBRARY } from "../../data/constants";
import { formatNumber, stripDiacritics } from "../../utils/helpers";
import GoogleFitButton from "../GoogleFitButton";

const CATEGORIES = ["Όλα", "Cardio", "Strength", "Flexibility"];

export default function ExerciseTab({
  exercises, exerciseValue, exerciseMinutes, setExerciseMinutes,
  customExerciseName, setCustomExerciseName,
  customExerciseMinutes, setCustomExerciseMinutes,
  customExerciseRate, setCustomExerciseRate,
  addExerciseByMinutes, addCustomExercise, deleteExercise,
  selectedDate, updateCurrentDay,
  favoriteExerciseKeys, toggleFavoriteExercise, isFavoriteExercise
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Όλα");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [selectedMinutes, setSelectedMinutes] = useState("30");

  const filteredExercises = useMemo(() => {
    let list = EXERCISE_LIBRARY;
    if (activeCategory !== "Όλα") {
      list = list.filter((e) => e.category === activeCategory);
    }
    if (query.trim().length >= 1) {
      const q = stripDiacritics(query.toLowerCase().trim());
      list = list.filter((e) =>
        stripDiacritics(e.name.toLowerCase()).includes(q)
      );
    }
    return list;
  }, [query, activeCategory]);

  const favoriteExercises = useMemo(() => {
    return EXERCISE_LIBRARY.filter((e) => isFavoriteExercise?.(e));
  }, [favoriteExerciseKeys]);

  function handleAddExercise() {
    if (!selectedExercise) return;
    addExerciseByMinutes(selectedExercise, selectedMinutes);
    setSelectedExercise(null);
    setSelectedMinutes("30");
  }

  function handleAddFromFit(exercise) {
    updateCurrentDay((current) => ({
      ...current,
      exercises: [exercise, ...current.exercises]
    }));
  }

  return (
    <>
      {/* ΑΣΚΗΣΗ ΗΜΕΡΑΣ */}
      <div className="day-card">
        <div className="day-card-total">
          <h2 style={{ color: "white", margin: 0, fontSize: 16 }}>Άσκηση ημέρας</h2>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#86efac" }}>+{formatNumber(exerciseValue)} kcal</span>
        </div>
        {exercises.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Δεν έχεις βάλει άσκηση ακόμα.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {exercises.map((item) => (
              <div key={item.id} className="day-card-entry">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="day-card-entry-title">{item.name}</span>
                  <span className="day-card-entry-meta">
                    {item.minutes > 0 ? `${item.minutes} λεπτά · ` : ""}+{formatNumber(item.calories)} kcal
                  </span>
                </div>
                <button className="day-card-btn" onClick={() => deleteExercise(item.id)} type="button">✕</button>
              </div>
            ))}
          </div>
        )}
        <GoogleFitButton selectedDate={selectedDate} onAddExercise={handleAddFromFit} />
      </div>

      {/* ΑΝΑΖΗΤΗΣΗ ΑΣΚΗΣΗΣ */}
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Προσθήκη άσκησης</h2>

        {/* Φίλτρα κατηγορίας */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} type="button"
              style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${activeCategory === cat ? "var(--color-accent)" : "var(--border-color)"}`, background: activeCategory === cat ? "var(--color-accent)" : "var(--bg-soft)", color: activeCategory === cat ? "var(--bg-card)" : "var(--text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {cat}
            </button>
          ))}
        </div>

        <input
          className="input"
          placeholder="Αναζήτηση άσκησης..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 8 }}
        />

        {/* Modal επιλογής λεπτών */}
        {selectedExercise && (
          <div style={{ background: "var(--bg-soft)", borderRadius: 14, padding: 14, marginBottom: 10, border: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              {selectedExercise.icon} {selectedExercise.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <button onClick={() => setSelectedMinutes((prev) => String(Math.max(5, Number(prev) - 5)))} type="button"
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", cursor: "pointer", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>−</button>
              <input className="input" type="number" value={selectedMinutes} onChange={(e) => setSelectedMinutes(e.target.value)}
                style={{ width: 70, textAlign: "center", padding: "6px 8px" }} />
              <button onClick={() => setSelectedMinutes((prev) => String(Number(prev) + 5))} type="button"
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", cursor: "pointer", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>+</button>
              <span className="muted" style={{ fontSize: 13 }}>λεπτά</span>
            </div>
            <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 13 }}>
              <span className="muted">Θερμίδες: </span>
              <strong>{formatNumber(Math.round(selectedExercise.caloriesPerMinute * (Number(selectedMinutes) || 0)))} kcal</strong>
              <span className="muted" style={{ marginLeft: 8 }}>· {selectedExercise.caloriesPerMinute} kcal/λεπτό</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-dark" onClick={handleAddExercise} type="button" style={{ flex: 1 }}>Προσθήκη</button>
              <button className="btn btn-light" onClick={() => setSelectedExercise(null)} type="button">Άκυρο</button>
            </div>
          </div>
        )}

        {/* Λίστα αποτελεσμάτων */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredExercises.map((exercise) => (
            <div key={exercise.name}
              style={{ display: "flex", alignItems: "center", gap: 6, background: selectedExercise?.name === exercise.name ? "var(--bg-soft)" : "var(--bg-card)", borderRadius: 8, border: `1px solid ${selectedExercise?.name === exercise.name ? "var(--color-accent)" : "var(--border-color)"}`, overflow: "hidden" }}>
              {/* Star button */}
              <button
                onClick={() => toggleFavoriteExercise?.(exercise)}
                type="button"
                title={isFavoriteExercise?.(exercise) ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
                style={{ padding: "10px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0, color: isFavoriteExercise?.(exercise) ? "#d97706" : "var(--text-muted)" }}>
                {isFavoriteExercise?.(exercise) ? "⭐" : "☆"}
              </button>
              {/* Exercise info */}
              <button onClick={() => setSelectedExercise(exercise)} type="button"
                style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px 8px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 8 }}>
                <div>
                  <span style={{ fontSize: 16, marginRight: 6 }}>{exercise.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{exercise.name}</span>
                  <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{exercise.category}</span>
                </div>
                <span className="muted" style={{ fontSize: 12, flexShrink: 0 }}>{exercise.caloriesPerMinute} kcal/λεπτό</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ΑΓΑΠΗΜΕΝΕΣ ΑΣΚΗΣΕΙΣ */}
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>⭐ Αγαπημένες ασκήσεις</h2>
        {favoriteExercises.length === 0 ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "14px 16px", border: "1px dashed var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Δεν έχεις αγαπημένες ασκήσεις ακόμα</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Ψάξε μια άσκηση παραπάνω και πάτα ☆ για να την προσθέσεις. Ο AI Coach θα προτείνει ασκήσεις από τα αγαπημένα σου!
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {favoriteExercises.map((exercise) => (
              <div key={exercise.name}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
                <button onClick={() => toggleFavoriteExercise?.(exercise)} type="button"
                  style={{ padding: "10px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0, color: "#d97706" }}>⭐</button>
                <button onClick={() => setSelectedExercise(exercise)} type="button"
                  style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px 8px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 16, marginRight: 6 }}>{exercise.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{exercise.name}</span>
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>{exercise.caloriesPerMinute} kcal/λεπτό</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CUSTOM ΑΣΚΗΣΗ */}
      <div className="card">
        <h2>Custom άσκηση</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" placeholder="Όνομα άσκησης" value={customExerciseName} onChange={(e) => setCustomExerciseName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Λεπτά" inputMode="numeric" value={customExerciseMinutes} onChange={(e) => setCustomExerciseMinutes(e.target.value)} />
            <input className="input" placeholder="kcal/λεπτό" inputMode="decimal" value={customExerciseRate} onChange={(e) => setCustomExerciseRate(e.target.value)} />
          </div>
          <button className="btn btn-dark" onClick={addCustomExercise} type="button">Προσθήκη</button>
        </div>
      </div>
    </>
  );
}