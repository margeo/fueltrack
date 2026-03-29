import { getSuggestedFoods } from "../utils/suggestions";

export default function SuggestionsBox({
  foods,
  mode,
  remainingCalories,
  remainingProtein,
  onSelectFood
}) {
  const suggestions = getSuggestedFoods({
    foods,
    modeKey: mode,
    remainingCalories,
    remainingProtein
  });

  if (!suggestions.length) return null;

  return (
    <div className="card">
      <h2>Τι να φας τώρα</h2>

      <div className="stack-10">
        {suggestions.map((food) => (
          <button
            key={food.id}
            className="food-choice"
            onClick={() => onSelectFood(food)}
          >
            <div style={{ fontWeight: 700 }}>{food.name}</div>

            <div className="muted">
              {food.caloriesPer100g} kcal · P {food.proteinPer100g}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}