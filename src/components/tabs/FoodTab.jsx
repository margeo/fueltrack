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
  quickAddFavorite
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

  const localResults = filteredFoods;

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

  const visibleFoods = sourceTab === "local" ? localResults : normalizedDatabaseResults;
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
      {favoriteFoods.length > 0 && (
        <div className="card">
          <h2>Αγαπημένα</h2>
          <div className="quick-grid">
            {favoriteFoods.map((food) => (
              <div key={food.id} className="soft-box">
                <div style={{ fontWeight: 700 }}>{food.name}</div>
                <div className="muted">{food.caloriesPer100g} kcal / 100g</div>
                <div className="action-row" style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-light"
                    onClick={() => {
                      setSelectedFood(food);
                      setSourceTab(food.source === "database" ? "database" : "local");
                    }}
                  >
                    Άνοιγμα
                  </button>
                  <button className="btn btn-dark" onClick={() => quickAddFavorite(food)}>
                    +100g
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentFoods.length > 0 && (
        <div className="card">
          <h2>Πρόσφατα</h2>
          <div className="quick-grid">
            {recentFoods.slice(0, 6).map((item) => (
              <div key={item.key} className="soft-box">
                <div style={{ fontWeight: 700 }}>{item.food.name}</div>
                <div className="muted">
                  {item.grams}g · {item.mealType}
                </div>
                <div className="action-row" style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-light"
                    onClick={() => {
                      setSelectedFood(item.food);
                      setFoodGrams(String(item.grams || 100));
                      setMealType(item.mealType || "Πρωινό");
                      setSourceTab(item.food.source === "database" ? "database" : "local");
                    }}
                  >
                    Επεξεργασία
                  </button>
                  <button className="btn btn-dark" onClick={() => quickAddRecent(item)}>
                    Ξανά
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="row wrap" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Αναζήτηση φαγητού</h2>
          {(query || selectedFood) && (
            <button className="btn btn-light" onClick={clearSearchAndSelection}>
              Καθαρισμός
            </button>
          )}
        </div>

        <div className="action-row" style={{ marginBottom: 12 }}>
          <button
            className={`btn ${sourceTab === "local" ? "btn-dark" : "btn-light"}`}
            onClick={() => switchTab("local")}
          >
            Local
          </button>
          <button
            className={`btn ${sourceTab === "database" ? "btn-dark" : "btn-light"}`}
            onClick={() => switchTab("database")}
          >
            Database
          </button>
        </div>

        <input
          className="input"
          placeholder={
            sourceTab === "local"
              ? "Γράψε φαγητό από τα τοπικά"
              : "Γράψε φαγητό από τη βάση δεδομένων"
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedFood(null);
          }}
        />

        <div className="stack-10">
          {sourceTab === "database" && databaseLoading && (
            <div className="muted" style={{ marginTop: 10 }}>
              Φόρτωση αποτελεσμάτων...
            </div>
          )}

          {!databaseLoading && query.trim() && visibleFoods.length === 0 ? (
            <div className="muted" style={{ marginTop: 10 }}>
              Δεν βρέθηκε φαγητό.
            </div>
          ) : !query.trim() && sourceTab === "database" ? (
            <div className="muted" style={{ marginTop: 10 }}>
              Ξεκίνα να γράφεις για αναζήτηση στη βάση δεδομένων.
            </div>
          ) : (
            visibleFoods.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} className="food-list-item">
                <button
                  className="food-choice"
                  onClick={() => setSelectedFood(food)}
                  style={{
                    border:
                      selectedFood &&
                      selectedFood.id === food.id &&
                      (selectedFood.source || "local") === (food.source || "local")
                        ? "1px solid #111827"
                        : "1px solid #e5e7eb"
                  }}
                >
                  <div className="row">
                    <div style={{ fontWeight: 700 }}>
                      {food.name}
                      {food.brand ? ` · ${food.brand}` : ""}
                    </div>

                    <div
                      className={
                        food.source === "database" ? "badge badge-dark" : "badge badge-local"
                      }
                    >
                      {food.source === "database" ? "Database" : "Τοπικό"}
                    </div>
                  </div>

                  <div className="muted" style={{ marginTop: 6 }}>
                    {food.caloriesPer100g} kcal / 100g · P {food.proteinPer100g || 0} · C{" "}
                    {food.carbsPer100g || 0} · F {food.fatPer100g || 0}
                  </div>
                </button>

                <button className="btn btn-light" onClick={() => toggleFavorite(food)}>
                  {isFavorite(food) ? "★" : "☆"}
                </button>
              </div>
            ))
          )}
        </div>

        {selectedFood ? (
          <div className="soft-box" style={{ marginTop: 14 }}>
            <div className="row wrap">
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedFood.name}</div>
                <div className="muted">
                  {selectedFood.source === "database"
                    ? "Επιλεγμένο φαγητό από βάση δεδομένων"
                    : "Επιλεγμένο τοπικό φαγητό"}
                </div>
              </div>

              <button className="btn btn-light" onClick={() => setSelectedFood(null)}>
                ✕
              </button>
            </div>

            <div className="grid-2" style={{ marginTop: 10 }}>
              <div>
                <div className="muted" style={{ marginBottom: 6 }}>
                  Γραμμάρια
                </div>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={foodGrams}
                  onChange={(e) => setFoodGrams(e.target.value)}
                />
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 6 }}>
                  Γεύμα
                </div>
                <select
                  className="input"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                >
                  {MEALS.map((meal) => (
                    <option key={meal}>{meal}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="soft-box">
                <div className="muted">Θερμίδες</div>
                <div>{formatNumber(preview?.calories || 0)}</div>
              </div>
              <div className="soft-box">
                <div className="muted">Protein</div>
                <div>{formatNumber(preview?.protein || 0)}g</div>
              </div>
              <div className="soft-box">
                <div className="muted">Carbs</div>
                <div>{formatNumber(preview?.carbs || 0)}g</div>
              </div>
              <div className="soft-box">
                <div className="muted">Fat</div>
                <div>{formatNumber(preview?.fat || 0)}g</div>
              </div>
            </div>

            <div className="muted" style={{ margin: "10px 0" }}>
              Για {foodGrams || 0}g στο {mealType}
            </div>

            <button className="btn btn-dark" onClick={addSelectedFood}>
              Προσθήκη φαγητού
            </button>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 12 }}>
            Διάλεξε ένα φαγητό για να βάλεις γραμμάρια και γεύμα.
          </div>
        )}
      </div>

      <div className="card">
        <h2>Νέο φαγητό</h2>

        <div className="stack-10">
          <input
            className="input"
            placeholder="Όνομα"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <input
            className="input"
            type="number"
            placeholder="Θερμίδες / 100g"
            value={newCalories}
            onChange={(e) => setNewCalories(e.target.value)}
          />

          <div className="grid-3">
            <input
              className="input"
              type="number"
              placeholder="Protein / 100g"
              value={newProtein}
              onChange={(e) => setNewProtein(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="Carbs / 100g"
              value={newCarbs}
              onChange={(e) => setNewCarbs(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="Fat / 100g"
              value={newFat}
              onChange={(e) => setNewFat(e.target.value)}
            />
          </div>

          <button className="btn btn-dark" onClick={handleAddCustomFood}>
            Προσθήκη φαγητού
          </button>
        </div>
      </div>
    </>
  );
}