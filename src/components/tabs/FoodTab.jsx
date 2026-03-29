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
  const [sourceTab, setSourceTab] = useState("local");
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodGrams, setFoodGrams] = useState("100");
  const [mealType, setMealType] = useState("Πρωινό");

  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newProtein, setNewProtein] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newFat, setNewFat] = useState("");

  const { results: databaseResults, loading: databaseLoading } = useFoodSearch(
    sourceTab === "database" ? query : ""
  );

  const filteredFoods = useMemo(() => {
    if (!query.trim()) return foods;

    return foods.filter((food) =>
      `${food.name} ${food.brand || ""}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [foods, query]);

  const normalizedDatabaseResults = useMemo(() => {
    return (Array.isArray(databaseResults) ? databaseResults : []).map((food) =>
      normalizeFood({
        id: food.id,
        source: "database",
        name: food.name,
        brand: food.brand || "USDA",
        caloriesPer100g: Number(food.calories) || 0,
        proteinPer100g: Number(food.protein) || 0,
        carbsPer100g: Number(food.carbs) || 0,
        fatPer100g: Number(food.fat) || 0
      })
    );
  }, [databaseResults]);

  const visibleFoods = sourceTab === "local" ? filteredFoods : normalizedDatabaseResults;
  const preview = selectedFood ? createFoodEntry(selectedFood, foodGrams, mealType) : null;

  function resetSelection() {
    setSelectedFood(null);
    setFoodGrams("100");
    setMealType("Πρωινό");
  }

  function clearSearchAndSelection() {
    setQuery("");
    resetSelection();
  }

  function switchTab(nextTab) {
    setSourceTab(nextTab);
    clearSearchAndSelection();
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

  return (
    <>
      <div className="card">
        <h2>Φαγητό ημέρας</h2>

        {entries.length === 0 ? (
          <div className="muted">Δεν έχεις βάλει φαγητό.</div>
        ) : (
          <div className="stack-10">
            {MEALS.map((meal) => {
              const group = groupedEntries[meal];
              if (!group || group.items.length === 0) return null;

              return (
                <div key={meal} className="soft-box">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                      flexWrap: "wrap"
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{meal}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {formatNumber(group.totalCalories)} kcal
                    </div>
                  </div>

                  <div className="stack-10">
                    {group.items.map((item) => (
                      <div key={item.id} className="food-list-item">
                        <button
                          className="food-choice"
                          onClick={() => openEditEntry(item)}
                          style={{ textAlign: "left" }}
                        >
                          <div style={{ fontWeight: 700 }}>{item.name}</div>
                          <div className="muted" style={{ marginTop: 4 }}>
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

                        <button
                          className="btn btn-light"
                          onClick={() => openEditEntry(item)}
                        >
                          Edit
                        </button>

                        <button
                          className="btn btn-light"
                          onClick={() => deleteEntry(item.id)}
                        >
                          X
                        </button>
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

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            className={sourceTab === "local" ? "btn btn-dark" : "btn btn-light"}
            onClick={() => switchTab("local")}
            type="button"
          >
            Local
          </button>

          <button
            className={sourceTab === "database" ? "btn btn-dark" : "btn btn-light"}
            onClick={() => switchTab("database")}
            type="button"
          >
            Database
          </button>
        </div>

        <input
          className="input"
          placeholder="Γράψε φαγητό"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedFood(null);
          }}
        />

        {sourceTab === "database" && databaseLoading && (
          <div className="muted" style={{ marginTop: 10 }}>
            Αναζήτηση στη βάση...
          </div>
        )}

        <div className="stack-10" style={{ marginTop: 12 }}>
          {visibleFoods.map((food) => (
            <div key={food.id} className="food-list-item">
              <button
                className="food-choice"
                onClick={() => setSelectedFood(food)}
              >
                <div style={{ fontWeight: 700 }}>
                  {food.name}
                  {food.brand ? ` · ${food.brand}` : ""}
                </div>
                <div className="muted">
                  {formatNumber(food.caloriesPer100g || 0)} kcal · P{" "}
                  {formatNumber(food.proteinPer100g || 0)} · C{" "}
                  {formatNumber(food.carbsPer100g || 0)} · F{" "}
                  {formatNumber(food.fatPer100g || 0)}
                </div>
              </button>

              <button
                className="btn btn-light"
                onClick={() => toggleFavorite(food)}
              >
                {isFavorite(food) ? "★" : "☆"}
              </button>
            </div>
          ))}
        </div>

        {selectedFood && (
          <div className="soft-box" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {selectedFood.name}
              {selectedFood.brand ? ` · ${selectedFood.brand}` : ""}
            </div>

            <div className="stack-10">
              <input
                className="input"
                value={foodGrams}
                onChange={(e) => setFoodGrams(e.target.value)}
                placeholder="Γραμμάρια"
                inputMode="numeric"
              />

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

              {preview && (
                <div className="muted">
                  Preview: {formatNumber(preview.calories || 0)} kcal · P{" "}
                  {formatNumber(preview.protein || 0)} · C{" "}
                  {formatNumber(preview.carbs || 0)} · F{" "}
                  {formatNumber(preview.fat || 0)}
                </div>
              )}

              <button className="btn btn-dark" onClick={addSelectedFood}>
                Προσθήκη
              </button>
            </div>
          </div>
        )}

        <div className="soft-box" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Custom φαγητό</div>

          <div className="stack-10">
            <input
              className="input"
              placeholder="Όνομα"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

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

            <button className="btn btn-dark" onClick={handleAddCustomFood}>
              Αποθήκευση food
            </button>
          </div>
        </div>
      </div>

      {recentFoods.length > 0 && (
        <div className="card">
          <h2>Πρόσφατα</h2>

          <div className="stack-10">
            {recentFoods.slice(0, 6).map((item) => {
              const recentPreview = createFoodEntry(item.food, item.grams, item.mealType);

              return (
                <div key={item.key} className="food-list-item">
                  <div className="food-choice" style={{ cursor: "default" }}>
                    <div style={{ fontWeight: 700 }}>{item.food.name}</div>
                    <div className="muted">
                      {item.grams}g · {item.mealType} · {formatNumber(recentPreview.calories || 0)} kcal
                    </div>
                  </div>

                  <button
                    className="btn btn-light"
                    onClick={() => {
                      setSelectedFood(item.food);
                      setFoodGrams(String(item.grams || 100));
                      setMealType(item.mealType || "Πρωινό");
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="btn btn-dark"
                    onClick={() => quickAddRecent(item)}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {favoriteFoods.length > 0 && (
        <div className="card">
          <h2>Αγαπημένα</h2>

          <div className="stack-10">
            {favoriteFoods.map((food) => (
              <div key={food.id} className="food-list-item">
                <div className="food-choice" style={{ cursor: "default" }}>
                  <div style={{ fontWeight: 700 }}>{food.name}</div>
                  <div className="muted">
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{" "}
                    {formatNumber(food.proteinPer100g || 0)}
                  </div>
                </div>

                <button
                  className="btn btn-light"
                  onClick={() => setSelectedFood(food)}
                >
                  Άνοιγμα
                </button>

                <button
                  className="btn btn-dark"
                  onClick={() => quickAddFavorite(food)}
                >
                  +100g
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}