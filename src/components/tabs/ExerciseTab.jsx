// src/components/tabs/ExerciseTab.jsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EXERCISE_LIBRARY } from "../../data/constants";
import { formatNumber, stripDiacritics } from "../../utils/helpers";
import GoogleFitButton from "../GoogleFitButton";

const CATEGORIES = [
  { key: "Όλα", labelKey: "exercise.categories.all" },
  { key: "Cardio", labelKey: "exercise.categories.cardio", icon: "🏃" },
  { key: "Gym", labelKey: "exercise.categories.gym", icon: "🏋️" },
  { key: "Training", labelKey: "exercise.categories.training", icon: "🔥" },
  { key: "Sports", labelKey: "exercise.categories.sports", icon: "⚽" },
];

export default function ExerciseTab({
  exercises, exerciseValue,
  customExerciseName, setCustomExerciseName,
  customExerciseMinutes, setCustomExerciseMinutes,
  customExerciseRate, setCustomExerciseRate,
  addExerciseByMinutes, addCustomExercise, deleteExercise,
  selectedDate, updateCurrentDay,
  favoriteExerciseKeys, toggleFavoriteExercise, isFavoriteExercise,
  recentExercises, quickAddRecentExercise
}) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("Όλα");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExerciseName, setSelectedExerciseName] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState("30");

  const filteredExercises = useMemo(() => {
    let list = activeCategory === "Όλα"
      ? EXERCISE_LIBRARY
      : EXERCISE_LIBRARY.filter((e) => e.category === activeCategory);

    if (searchQuery.trim().length >= 1) {
      const q = stripDiacritics(searchQuery.toLowerCase().trim());
      list = list.filter((e) =>
        stripDiacritics(e.name.toLowerCase()).includes(q)
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  const selectedExercise = EXERCISE_LIBRARY.find((e) => e.name === selectedExerciseName) || null;

  const favoriteExercises = useMemo(() => {
    return EXERCISE_LIBRARY.filter((e) => isFavoriteExercise?.(e));
  }, [favoriteExerciseKeys]);

  function handleAddExercise() {
    if (!selectedExercise) return;
    addExerciseByMinutes(selectedExercise, selectedMinutes);
    setSelectedExerciseName("");
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
          <h2>🏋️ {t("exercise.dayTitle")}</h2>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#86efac" }}>+{formatNumber(exerciseValue)} kcal</span>
        </div>
        {exercises.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>{t("exercise.empty")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {exercises.map((item) => (
              <div key={item.id} className="day-card-entry">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="day-card-entry-title">{item.name}</span>
                  <span className="day-card-entry-meta">
                    {item.minutes > 0 ? `${item.minutes} ${t("common.minutes")} · ` : ""}+{formatNumber(item.calories)} kcal
                  </span>
                </div>
                <button className="day-card-btn" onClick={() => deleteExercise(item.id)} type="button">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ΠΡΟΣΘΗΚΗ ΑΣΚΗΣΗΣ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>{t("exercise.addTitle")}</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-dark" type="button"
              style={{ fontSize: 13, padding: "8px 0", width: 90, textAlign: "center", opacity: 0.5 }}
              onClick={() => alert(t("exercise.appleHealthSoon"))}>
              🍎 Health
            </button>
            <GoogleFitButton selectedDate={selectedDate} onAddExercise={handleAddFromFit} />
          </div>
        </div>

        {/* Search */}
        <input
          className="input"
          placeholder={`🔍 ${t("exercise.searchPlaceholder")}`}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSelectedExerciseName(""); }}
          style={{ marginBottom: 10 }}
        />

        {/* Φίλτρα κατηγορίας */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setSelectedExerciseName(""); setSearchQuery(""); }} type="button"
              style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${activeCategory === cat.key ? "var(--color-accent)" : "var(--border-color)"}`, background: activeCategory === cat.key ? "var(--color-accent)" : "var(--bg-soft)", color: activeCategory === cat.key ? "var(--bg-card)" : "var(--text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {cat.icon ? `${cat.icon} ${t(cat.labelKey)}` : t(cat.labelKey)}
            </button>
          ))}
        </div>

        {/* Dropdown + Star */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <select
            className="input"
            value={selectedExerciseName}
            onChange={(e) => setSelectedExerciseName(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">{t("exercise.selectExercise")}</option>
            {filteredExercises.map((e) => (
              <option key={e.name} value={e.name}>
                {e.icon} {t("exerciseNames." + e.name, { defaultValue: e.name })} · {e.caloriesPerMinute} {t("exercise.kcalPerMin")}
              </option>
            ))}
          </select>
          {selectedExercise && (
            <button
              onClick={() => toggleFavoriteExercise?.(selectedExercise)}
              type="button"
              title={isFavoriteExercise?.(selectedExercise) ? t("exercise.removeFavorite") : t("exercise.addFavorite")}
              style={{ padding: "10px 12px", background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, cursor: "pointer", fontSize: 18, flexShrink: 0, color: isFavoriteExercise?.(selectedExercise) ? "#d97706" : "var(--text-muted)" }}>
              {isFavoriteExercise?.(selectedExercise) ? "⭐" : "☆"}
            </button>
          )}
        </div>

        {/* Λεπτά + Preview + Add */}
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
              <span className="muted" style={{ fontSize: 13 }}>{t("common.minutes")}</span>
            </div>
            <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 13 }}>
              <span className="muted">{t("exercise.caloriesLabel")} </span>
              <strong>{formatNumber(Math.round(selectedExercise.caloriesPerMinute * (Number(selectedMinutes) || 0)))} kcal</strong>
              <span className="muted" style={{ marginLeft: 8 }}>· {selectedExercise.caloriesPerMinute} {t("exercise.kcalPerMin")}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-dark" onClick={handleAddExercise} type="button" style={{ flex: 1 }}>{t("common.add")}</button>
              <button className="btn btn-light" onClick={() => setSelectedExerciseName("")} type="button">{t("common.cancel")}</button>
            </div>
          </div>
        )}

        {/* No results */}
        {filteredExercises.length === 0 && (
          <div className="muted" style={{ fontSize: 13, padding: "8px 4px" }}>{t("exercise.noExercisesFound")}</div>
        )}
      </div>

      {/* ΑΓΑΠΗΜΕΝΕΣ ΑΣΚΗΣΕΙΣ */}
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>⭐ {t("exercise.favoritesTitle")}</h2>
        {favoriteExercises.length === 0 ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "14px 16px", border: "1px dashed var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t("exercise.noFavorites")}</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              {t("exercise.noFavoritesHint")}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {favoriteExercises.map((exercise) => (
              <div key={exercise.name}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", overflow: "hidden", minHeight: 40 }}>
                <button className="btn btn-dark" onClick={() => { setSelectedExerciseName(exercise.name); setSelectedMinutes("30"); }} type="button"
                  style={{ padding: "4px 10px", fontSize: 12, margin: "0 0 0 8px", flexShrink: 0 }}>+</button>
                <div style={{ flex: 1, minWidth: 0, padding: "8px 0", overflow: "hidden" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.icon} {t("exerciseNames." + exercise.name, { defaultValue: exercise.name })}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{exercise.category} · {exercise.caloriesPerMinute} {t("exercise.kcalPerMin")}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 8, alignItems: "center" }}>
                  <button className="btn btn-light" onClick={() => { setSelectedExerciseName(exercise.name); setSelectedMinutes("30"); }} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                  <button onClick={() => toggleFavoriteExercise?.(exercise)} type="button"
                    style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#d97706" }}>⭐</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ΠΡΟΣΦΑΤΑ */}
      {recentExercises && recentExercises.length > 0 && (
        <div className="card">
          <h2>{t("common.recent")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentExercises.slice(0, 6).map((item) => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", overflow: "hidden", minHeight: 40 }}>
                <button className="btn btn-dark" onClick={() => quickAddRecentExercise(item)} type="button"
                  style={{ padding: "4px 10px", fontSize: 12, margin: "0 0 0 8px", flexShrink: 0, alignSelf: "center" }}>+</button>
                <div style={{ flex: 1, minWidth: 0, padding: "8px 0", overflow: "hidden" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.exercise.icon} {t("exerciseNames." + item.exercise.name, { defaultValue: item.exercise.name })}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{item.minutes} {t("common.minutes")} · {Math.round(item.exercise.caloriesPerMinute * item.minutes)} kcal</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 8, alignItems: "center" }}>
                  <button onClick={() => { setSelectedExerciseName(item.exercise.name); setSelectedMinutes(String(item.minutes)); }} type="button"
                    style={{ padding: "4px 8px", fontSize: 11, borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", color: "var(--text-muted)" }}>✏️</button>
                  <button onClick={() => toggleFavoriteExercise?.(item.exercise)} type="button"
                    style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: isFavoriteExercise?.(item.exercise) ? "#d97706" : "var(--text-muted)" }}>
                    {isFavoriteExercise?.(item.exercise) ? "⭐" : "☆"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOM ΑΣΚΗΣΗ */}
      <div className="card">
        <h2>{t("exercise.customExercise")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" placeholder={t("exercise.exerciseName")} value={customExerciseName} onChange={(e) => setCustomExerciseName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder={t("exercise.minutesLabel")} inputMode="numeric" value={customExerciseMinutes} onChange={(e) => setCustomExerciseMinutes(e.target.value)} />
            <input className="input" placeholder={t("exercise.kcalPerMin")} inputMode="decimal" value={customExerciseRate} onChange={(e) => setCustomExerciseRate(e.target.value)} />
          </div>
          <button className="btn btn-dark" onClick={addCustomExercise} type="button">{t("common.add")}</button>
        </div>
      </div>
    </>
  );
}