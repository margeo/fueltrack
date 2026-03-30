import { useMemo, useState } from "react";
import { MEALS } from "../../data/constants";
import { createFoodEntry, formatNumber, normalizeFood } from "../../utils/helpers";
import useFoodSearch from "../../hooks/useFoodSearch";

export default function FoodTab({
  foods,
  recentFoods,
  favoriteFoods,
  isFavorite,
  toggleFavorite,
  addCustomFood,
  saveRecentFood,
  updateCurrentDay,
  quickAddRecent,
  quickAddFavorite,
  entries,
  groupedEntries,
  deleteEntry,
  openEditEntry
}) {
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodGrams, setFoodGrams] = useState("100");
  const [mealType, setMealType] = useState("Πρωινό");

  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newProtein, setNewProtein] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newFat, setNewFat] = useState("");

  const { results: databaseResults, loading: databaseLoading } = useFoodSearch(query);

  const filteredFoods = useMemo(() => {
    if (!query.trim()) return foods;

    const q = query.toLowerCase().trim();

    return foods.filter((food) =>
      `${food.name} ${food.brand || ""}`.toLowerCase().includes(q)
    );
  }, [foods, query]);

  const normalizedDatabaseResults = useMemo(() => {
    return (Array.isArray(databaseResults) ? databaseResults : []).map((food) =>
      normalizeFood({
        id: food.id,
        source: food.source || "database",
        sourceLabel: food.sourceLabel || "Database",
        name: food.name,
        brand: food.brand || "USDA",
        caloriesPer100g: Number(food.caloriesPer100g ?? food.calories) || 0,
        proteinPer100g: Number(food.proteinPer100g ?? food.protein) || 0,
        carbsPer100g: Number(food.carbsPer100g ?? food.carbs) || 0,
        fatPer100g: Number(food.fatPer100g ?? food.fat) || 0
      })
    );
  }, [databaseResults]);

  const visibleFoods = useMemo(() => {
    const localFoods = filteredFoods.map((food) =>
      normalizeFood({
        ...food,
        source: food.source || "local",
        sourceLabel: food.sourceLabel || "Local"
      })
    );

    const merged = [...localFoods, ...normalizedDatabaseResults];
    const seen = new Set();

    return merged.filter((food) => {
      const key = `${String(food.name || "").trim().toLowerCase()}|${String(
        food.brand || ""
      )
        .trim()
        .toLowerCase()}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredFoods, normalizedDatabaseResults]);

  const topSearchResults = useMemo(() => visibleFoods.slice(0, 8), [visibleFoods]);
  const preview = selectedFood ? createFoodEntry(selectedFood, foodGrams, mealType) : null;
  const showAutocomplete = query.trim().length >= 2;
  const showFullResultsList = query.trim().length === 0 || visibleFoods.length > 0;

  function resetSelection() {
    setSelectedFood(null);
    setFoodGrams("100");
    setMealType("Πρωινό");
  }

  function clearSearchAndSelection() {
    setQuery("");
    resetSelection();
  }

  function addSelectedFood() {
    if (!selectedFood) return;

    const entry = createFoodEntry(selectedFood, foodGrams, mealType);

    updateCurrentDay((current) => ({
      ...current,
      entries: [entry, ...current.entries]
    }));

    saveRecentFood(selectedFood, foodGrams, mealType);
    clearSearchAndSelection();
  }

  function handleAddCustomFood() {
    if (!newName.trim() || !newCalories) return;

    addCustomFood(
      normalizeFood({
        id: `local-${Date.now()}`,
        source: "local",
        sourceLabel: "Local",
        name: newName.trim(),
        caloriesPer100g: Number(newCalories) || 0,
        proteinPer100g: Number(newProtein) || 0,
        carbsPer100g: Number(newCarbs) || 0,
        fatPer100g: Number(newFat) || 0
      })
    );

    setNewName("");
    setNewCalories("");
    setNewProtein("");
    setNewCarbs("");
    setNewFat("");
  }

  function getSourceBadge(food) {
    if (food.sourceLabel) return food.sourceLabel;
    if (food.source === "local") return "Local";
    if (food.source === "usda") return "USDA";
    if (food.source === "off") return "Open Food";
    if (food.source === "database") return "Database";
    return "";
  }

  return (
    <>
      <div className="card">
        <h2>Φαγητό ημέρας</h2>

        {entries.length === 0 ? (
          <div className="soft-box">
            <div className="muted">Δεν έχεις βάλει φαγητό.</div>
          </div>
        ) : (
          <div className="stack-10">
            {MEALS.map((meal) => {
              const group = groupedEntries[meal];
              if (!group || group.items.length === 0) return null;

              return (
                <div key={meal} className="soft-box food-meal-group">
                  <div className="food-meal-head">
                    <div style={{ fontWeight: 700 }}>{meal}</div>
                    <div className="muted">{formatNumber(group.totalCalories)} kcal</div>
                  </div>

                  <div className="food-day-list">
                    {group.items.map((item) => (
                      <div key={item.id} className="food-entry-card">
                        <button
                          className="food-entry-main"
                          onClick={() => openEditEntry(item)}
                          type="button"
                        >
                          <div className="food-entry-title">{item.name}</div>

                          <div className="muted food-entry-meta">
                            {item.grams}g · {formatNumber(item.calories || 0)} kcal
                            {item.protein !== undefined
                              ? ` · P ${formatNumber(item.protein || 0)}`
                              : ""}
                            {item.carbs !== undefined
                              ? ` · C ${formatNumber(item.carbs || 0)}`
                              : ""}
                            {item.fat !== undefined
                              ? ` · F ${formatNumber(item.fat || 0)}`
                              : ""}
                          </div>
                        </button>

                        <div className="food-entry-actions">
                          <button
                            className="btn btn-light"
                            onClick={() => openEditEntry(item)}
                            type="button"
                          >
                            Edit
                          </button>

                          <button
                            className="btn btn-light"
                            onClick={() => deleteEntry(item.id)}
                            type="button"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Αναζήτηση φαγητού</h2>

        <div className="food-search-wrap">
          <input
            className="input"
            placeholder="Γράψε φαγητό"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedFood(null);
            }}
          />

          {showAutocomplete && (
            <div className="food-autocomplete-panel">
              {databaseLoading && (
                <div className="muted food-autocomplete-state">Αναζήτηση...</div>
              )}

              {!databaseLoading && topSearchResults.length === 0 && (
                <div className="muted food-autocomplete-state">
                  Δεν βρέθηκαν αποτελέσματα.
                </div>
              )}

              {!databaseLoading &&
                topSearchResults.map((food) => (
                  <button
                    key={`auto-${food.id}`}
                    className="food-autocomplete-item"
                    onClick={() => setSelectedFood(food)}
                    type="button"
                  >
                    <div className="food-result-top">
                      <div className="food-result-name">
                        {food.name}
                        {food.brand ? ` · ${food.brand}` : ""}
                      </div>

                      {getSourceBadge(food) ? (
                        <span className="tag">{getSourceBadge(food)}</span>
                      ) : null}
                    </div>

                    <div className="muted food-result-meta">
                      {formatNumber(food.caloriesPer100g || 0)} kcal · P{" "}
                      {formatNumber(food.proteinPer100g || 0)} · C{" "}
                      {formatNumber(food.carbsPer100g || 0)} · F{" "}
                      {formatNumber(food.fatPer100g || 0)}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {selectedFood && (
          <div className="soft-box food-selected-box">
            <div className="food-selected-head">
              <div className="food-selected-title">
                {selectedFood.name}
                {selectedFood.brand ? ` · ${selectedFood.brand}` : ""}
              </div>

              {getSourceBadge(selectedFood) ? (
                <span className="tag">{getSourceBadge(selectedFood)}</span>
              ) : null}
            </div>

            <div className="food-selected-controls">
              <label className="food-inline-field">
                <span className="muted">Γραμμάρια</span>
                <input
                  className="input"
                  value={foodGrams}
                  onChange={(e) => setFoodGrams(e.target.value)}
                  placeholder="Γραμμάρια"
                  inputMode="numeric"
                />
              </label>

              <label className="food-inline-field">
                <span className="muted">Γεύμα</span>
                <select
                  className="input"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                >
                  {MEALS.map((meal) => (
                    <option key={meal} value={meal}>
                      {meal}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {preview && (
              <div className="soft-box food-preview-box">
                <div className="muted">
                  Preview: {formatNumber(preview.calories || 0)} kcal · P{" "}
                  {formatNumber(preview.protein || 0)} · C{" "}
                  {formatNumber(preview.carbs || 0)} · F{" "}
                  {formatNumber(preview.fat || 0)}
                </div>
              </div>
            )}

            <div className="action-row">
              <button className="btn btn-dark" onClick={addSelectedFood} type="button">
                Προσθήκη
              </button>

              <button
                className="btn btn-light"
                onClick={clearSearchAndSelection}
                type="button"
              >
                Καθαρισμός
              </button>
            </div>
          </div>
        )}

        {showFullResultsList && (
          <div className="food-results-list">
            {visibleFoods.map((food) => (
              <div key={food.id} className="food-result-card">
                <button
                  className="food-result-main"
                  onClick={() => setSelectedFood(food)}
                  type="button"
                >
                  <div className="food-result-top">
                    <div className="food-result-name">
                      {food.name}
                      {food.brand ? ` · ${food.brand}` : ""}
                    </div>

                    {getSourceBadge(food) ? (
                      <span className="tag">{getSourceBadge(food)}</span>
                    ) : null}
                  </div>

                  <div className="muted food-result-meta">
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{" "}
                    {formatNumber(food.proteinPer100g || 0)} · C{" "}
                    {formatNumber(food.carbsPer100g || 0)} · F{" "}
                    {formatNumber(food.fatPer100g || 0)}
                  </div>
                </button>

                <button
                  className="btn btn-light food-fav-btn"
                  onClick={() => toggleFavorite(food)}
                  type="button"
                >
                  {isFavorite(food) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="soft-box food-custom-box">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Custom φαγητό</div>

          <div className="stack-10">
            <input
              className="input"
              placeholder="Όνομα"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <div className="grid-2">
              <input
                className="input"
                placeholder="kcal / 100g"
                inputMode="numeric"
                value={newCalories}
                onChange={(e) => setNewCalories(e.target.value)}
              />

              <input
                className="input"
                placeholder="Protein / 100g"
                inputMode="decimal"
                value={newProtein}
                onChange={(e) => setNewProtein(e.target.value)}
              />

              <input
                className="input"
                placeholder="Carbs / 100g"
                inputMode="decimal"
                value={newCarbs}
                onChange={(e) => setNewCarbs(e.target.value)}
              />

              <input
                className="input"
                placeholder="Fat / 100g"
                inputMode="decimal"
                value={newFat}
                onChange={(e) => setNewFat(e.target.value)}
              />
            </div>

            <button className="btn btn-dark" onClick={handleAddCustomFood} type="button">
              Αποθήκευση food
            </button>
          </div>
        </div>
      </div>

      {recentFoods.length > 0 && (
        <div className="card">
          <h2>Πρόσφατα</h2>

          <div className="food-compact-list">
            {recentFoods.slice(0, 6).map((item) => {
              const recentPreview = createFoodEntry(item.food, item.grams, item.mealType);

              return (
                <div key={item.key} className="food-compact-card">
                  <div className="food-compact-main">
                    <div className="food-compact-title">{item.food.name}</div>
                    <div className="muted food-compact-meta">
                      {item.grams}g · {item.mealType} · {formatNumber(recentPreview.calories || 0)}{" "}
                      kcal
                    </div>
                  </div>

                  <div className="food-compact-actions">
                    <button
                      className="btn btn-light"
                      onClick={() => {
                        setSelectedFood(item.food);
                        setFoodGrams(String(item.grams || 100));
                        setMealType(item.mealType || "Πρωινό");
                      }}
                      type="button"
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn-dark"
                      onClick={() => quickAddRecent(item)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {favoriteFoods.length > 0 && (
        <div className="card">
          <h2>Αγαπημένα</h2>

          <div className="food-compact-list">
            {favoriteFoods.map((food) => (
              <div key={food.id} className="food-compact-card">
                <div className="food-compact-main">
                  <div className="food-result-top">
                    <div className="food-compact-title">{food.name}</div>
                    {getSourceBadge(food) ? <span className="tag">{getSourceBadge(food)}</span> : null}
                  </div>

                  <div className="muted food-compact-meta">
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{" "}
                    {formatNumber(food.proteinPer100g || 0)}
                  </div>
                </div>

                <div className="food-compact-actions">
                  <button
                    className="btn btn-light"
                    onClick={() => setSelectedFood(food)}
                    type="button"
                  >
                    Άνοιγμα
                  </button>

                  <button
                    className="btn btn-dark"
                    onClick={() => quickAddFavorite(food)}
                    type="button"
                  >
                    +100g
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}