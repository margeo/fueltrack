export function getSuggestedFoods({
  foods,
  modeKey,
  remainingCalories,
  remainingProtein
}) {
  if (!Array.isArray(foods) || foods.length === 0) return [];

  return foods
    .filter((food) => Number(food.caloriesPer100g || 0) > 0)
    .filter((food) => Number(food.caloriesPer100g || 0) <= Math.max(remainingCalories, 250) + 120)
    .filter((food) => {
      const carbs = Number(food.carbsPer100g || 0);
      if (modeKey === "keto") return carbs <= 8;
      if (modeKey === "low_carb") return carbs <= 15;
      return true;
    })
    .sort((a, b) => {
      const aProtein = Number(a.proteinPer100g || 0);
      const bProtein = Number(b.proteinPer100g || 0);
      const aCalories = Number(a.caloriesPer100g || 0);
      const bCalories = Number(b.caloriesPer100g || 0);
      const aCarbs = Number(a.carbsPer100g || 0);
      const bCarbs = Number(b.carbsPer100g || 0);

      let aScore = 0;
      let bScore = 0;

      if (remainingProtein > 15) {
        aScore += aProtein * 3;
        bScore += bProtein * 3;
      } else {
        aScore += aProtein * 1.5;
        bScore += bProtein * 1.5;
      }

      if (modeKey === "high_protein") {
        aScore += aProtein * 2;
        bScore += bProtein * 2;
      }

      if (modeKey === "low_carb") {
        aScore -= aCarbs * 2;
        bScore -= bCarbs * 2;
      }

      if (modeKey === "keto") {
        aScore -= aCarbs * 4;
        bScore -= bCarbs * 4;
      }

      aScore -= aCalories * 0.03;
      bScore -= bCalories * 0.03;

      return bScore - aScore;
    })
    .slice(0, 5);
}