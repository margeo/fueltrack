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
      {/* 🔥 FAVORITES - COMPACT */}
      {favoriteFoods.length > 0 && (
        <div className="card">
          <h2>Αγαπημένα</h2>

          <div className="stack-10">
            {favoriteFoods.map((food) => (
              <div key={food.id} className="food-list-item">
                <div className="food-choice" style={{ cursor: "default" }}>
                  <div style={{ fontWeight: 700 }}>{food.name}</div>
                  <div className="muted">
                    {food.caloriesPer100g} kcal · P {food.proteinPer100g || 0}
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

      {/* 🔥 RECENT - COMPACT */}
      {recentFoods.length > 0 && (
        <div className="card">
          <h2>Πρόσφατα</h2>

          <div className="stack-10">
            {recentFoods.slice(0, 6).map((item) => (
              <div key={item.key} className="food-list-item">
                <div className="food-choice" style={{ cursor: "default" }}>
                  <div style={{ fontWeight: 700 }}>{item.food.name}</div>
                  <div className="muted">
                    {item.grams}g · {item.mealType}
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
            ))}
          </div>
        </div>
      )}

      {/* 🔍 SEARCH + ADD (μένει ίδιο) */}
      <div className="card">
        <h2>Αναζήτηση φαγητού</h2>

        <input
          className="input"
          placeholder="Γράψε φαγητό"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedFood(null);
          }}
        />

        <div className="stack-10">
          {visibleFoods.map((food) => (
            <div key={food.id} className="food-list-item">
              <button
                className="food-choice"
                onClick={() => setSelectedFood(food)}
              >
                <div style={{ fontWeight: 700 }}>{food.name}</div>
                <div className="muted">
                  {food.caloriesPer100g} kcal · P {food.proteinPer100g || 0}
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
          <div className="soft-box" style={{ marginTop: 10 }}>
            <input
              className="input"
              value={foodGrams}
              onChange={(e) => setFoodGrams(e.target.value)}
            />

            <button className="btn btn-dark" onClick={addSelectedFood}>
              Προσθήκη
            </button>
          </div>
        )}
      </div>

      {/* 📊 DAY FOOD (μένει ίδιο) */}
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
                  <div style={{ fontWeight: 700 }}>{meal}</div>

                  {group.items.map((item) => (
                    <div key={item.id} className="food-list-item">
                      <div>
                        {item.name} ({item.grams}g)
                      </div>

                      <button
                        className="btn btn-light"
                        onClick={() => deleteEntry(item.id)}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}