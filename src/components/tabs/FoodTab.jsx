import { useMemo, useState } from "react";
import { MEALS } from "../../data/constants";
import { createFoodEntry, formatNumber, normalizeFood } from "../../utils/helpers";
import useFoodSearch from "../../hooks/useFoodSearch";

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().trim();
}

function getFoodSearchScore(food, query) {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const name = normalizeSearchText(food.name);
  const brand = normalizeSearchText(food.brand);
  const combined = `${name} ${brand}`.trim();

  let score = 0;
  if (name === q) score += 120;
  if (combined === q) score += 110;
  if (name.startsWith(q)) score += 80;
  if (brand.startsWith(q)) score += 35;
  if (name.includes(q)) score += 45;
  if (combined.includes(q)) score += 20;
  if (food.source === "local") score += 25;
  if (food.source === "usda") score += 10;
  if (food.source === "off") score += 8;

  const protein = Number(food.proteinPer100g || 0);
  const calories = Number(food.caloriesPer100g || 0);
  if (protein > 0) score += Math.min(protein, 30) * 0.1;
  if (calories > 0 && calories < 700) score += 2;

  return score;
}

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
        brand: food.brand || "",
        caloriesPer100g: Number(food.caloriesPer100g ?? food.calories) || 0,
        proteinPer100g: Number(food.proteinPer100g ?? food.protein) || 0,
        carbsPer100g: Number(food.carbsPer100g ?? food.carbs) || 0,
        fatPer100g: Number(food.fatPer100g ?? food.fat) || 0
      })
    );
  }, [databaseResults]);

  const visibleFoods = useMemo(() => {
    const localFoods = filteredFoods.map((food) =>
      normalizeFood({ ...food, source: food.source || "local", sourceLabel: food.sourceLabel || "Local" })
    );
    const merged = [...localFoods, ...normalizedDatabaseResults];
    const seen = new Set();
    const deduped = merged.filter((food) => {
      const key = `${String(food.name || "").trim().toLowerCase()}|${String(food.brand || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!query.trim()) return deduped;
    return [...deduped].sort((a, b) => getFoodSearchScore(b, query) - getFoodSearchScore(a, query));
  }, [filteredFoods, normalizedDatabaseResults, query]);

  const topSearchResults = useMemo(() => visibleFoods.slice(0, 8), [visibleFoods]);
  const preview = selectedFood ? createFoodEntry(selectedFood, foodGrams, mealType) : null;
  const showAutocomplete = query.trim().length >= 2;

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
    addCustomFood(normalizeFood({
      id: `local-${Date.now()}`,
      source: "local",
      sourceLabel: "Local",
      name: newName.trim(),
      caloriesPer100g: Number(newCalories) || 0,
      proteinPer100g: Number(newProtein) || 0,
      carbsPer100g: Number(newCarbs) || 0,
      fatPer100g: Number(newFat) || 0
    }));
    setNewName(""); setNewCalories(""); setNewProtein(""); setNewCarbs(""); setNewFat("");
  }

  function getSourceBadge(food) {
    if (food.source === "local") return "";
    if (food.source === "usda") return "USDA";
    if (food.source === "off") return "OpenFood";
    if (food.sourceLabel && food.sourceLabel !== "Local") return food.sourceLabel;
    return "";
  }

  const totalEntries = entries.length;

  return (
    <>
      {/* ΦΑΓΗΤΟ ΗΜΕΡΑΣ */}
      <div className="card">
        <h2>Φαγητό ημέρας</h2>

        {totalEntries === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Δεν έχεις βάλει φαγητό.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {MEALS.map((meal) => {
              const group = groupedEntries[meal];
              if (!group || group.items.length === 0) return null;

              return (
                <div key={meal}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 4px" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{meal}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{formatNumber(group.totalCalories)} kcal</span>
                  </div>
                  {group.items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg-soft)", borderRadius: 8, marginBottom: 4, border: "1px solid var(--border-soft)", gap: 8 }}>
                      <button
                        onClick={() => openEditEntry(item)}
                        type="button"
                        style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{item.name}</span>
                        <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                          {item.grams}g · {formatNumber(item.calories)} kcal · P{formatNumber(item.protein)}
                        </span>
                      </button>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button className="btn btn-light" onClick={() => openEditEntry(item)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                        <button className="btn btn-light" onClick={() => deleteEntry(item.id)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ΑΝΑΖΗΤΗΣΗ */}
      <div className="card">
        <h2>Αναζήτηση φαγητού</h2>

        <div style={{ position: "relative" }}>
          <input
            className="input"
            placeholder="Γράψε φαγητό..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedFood(null); }}
          />

          {showAutocomplete && (
            <div style={{ marginTop: 6, background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {databaseLoading && <div className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>Αναζήτηση...</div>}
              {!databaseLoading && topSearchResults.length === 0 && (
                <div className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>Δεν βρέθηκαν αποτελέσματα.</div>
              )}
              {!databaseLoading && topSearchResults.map((food) => (
                <button
                  key={`auto-${food.source || "local"}-${food.id}`}
                  onClick={() => setSelectedFood(food)}
                  type="button"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border-color)", cursor: "pointer", gap: 8, flexWrap: "wrap" }}
                >
                  <div style={{ textAlign: "left" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{food.name}{food.brand ? ` · ${food.brand}` : ""}</span>
                    {getSourceBadge(food) && <span className="tag" style={{ marginLeft: 6, fontSize: 11 }}>{getSourceBadge(food)}</span>}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedFood && (
          <div className="soft-box" style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              {selectedFood.name}{selectedFood.brand ? ` · ${selectedFood.brand}` : ""}
              {getSourceBadge(selectedFood) && <span className="tag" style={{ marginLeft: 6, fontSize: 11 }}>{getSourceBadge(selectedFood)}</span>}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <label style={{ flex: 1 }}>
                <div className="profile-label">Γραμμάρια</div>
                <input
                  className="input"
                  value={foodGrams}
                  onChange={(e) => setFoodGrams(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label style={{ flex: 1 }}>
                <div className="profile-label">Γεύμα</div>
                <select className="input" value={mealType} onChange={(e) => setMealType(e.target.value)}>
                  {MEALS.map((meal) => <option key={meal} value={meal}>{meal}</option>)}
                </select>
              </label>
            </div>

            {preview && (
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                {formatNumber(preview.calories)} kcal · P{formatNumber(preview.protein)} · C{formatNumber(preview.carbs)} · F{formatNumber(preview.fat)}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-dark" onClick={addSelectedFood} type="button" style={{ flex: 1 }}>Προσθήκη</button>
              <button className="btn btn-light" onClick={clearSearchAndSelection} type="button">✕</button>
            </div>
          </div>
        )}
      </div>

      {/* ΠΡΟΣΦΑΤΑ */}
      {recentFoods.length > 0 && (
        <div className="card">
          <h2>Πρόσφατα</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentFoods.slice(0, 6).map((item) => {
              const cal = createFoodEntry(item.food, item.grams, item.mealType);
              return (
                <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{item.food.name}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                      {item.grams}g · {item.mealType} · {formatNumber(cal.calories)} kcal
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      className="btn btn-light"
                      onClick={() => { setSelectedFood(item.food); setFoodGrams(String(item.grams || 100)); setMealType(item.mealType || "Πρωινό"); }}
                      type="button"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                    >✏️</button>
                    <button className="btn btn-dark" onClick={() => quickAddRecent(item)} type="button" style={{ padding: "4px 10px", fontSize: 12 }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ΑΓΑΠΗΜΕΝΑ */}
      {favoriteFoods.length > 0 && (
        <div className="card">
          <h2>Αγαπημένα</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {favoriteFoods.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{food.name}</span>
                  {getSourceBadge(food) && <span className="tag" style={{ marginLeft: 6, fontSize: 11 }}>{getSourceBadge(food)}</span>}
                  <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-light" onClick={() => setSelectedFood(food)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                  <button className="btn btn-dark" onClick={() => quickAddFavorite(food)} type="button" style={{ padding: "4px 10px", fontSize: 12 }}>+100g</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOM ΦΑΓΗΤΟ */}
      <div className="card">
        <h2>Custom φαγητό</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" placeholder="Όνομα" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="kcal/100g" inputMode="numeric" value={newCalories} onChange={(e) => setNewCalories(e.target.value)} />
            <input className="input" placeholder="Protein" inputMode="decimal" value={newProtein} onChange={(e) => setNewProtein(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Carbs" inputMode="decimal" value={newCarbs} onChange={(e) => setNewCarbs(e.target.value)} />
            <input className="input" placeholder="Fat" inputMode="decimal" value={newFat} onChange={(e) => setNewFat(e.target.value)} />
          </div>
          <button className="btn btn-dark" onClick={handleAddCustomFood} type="button">Αποθήκευση</button>
        </div>
      </div>
    </>
  );
}