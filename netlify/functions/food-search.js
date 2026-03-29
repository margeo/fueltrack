export async function handler(event) {
  try {
    const query = event.queryStringParameters?.q?.trim();

    if (!query || query.length < 2) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      };
    }

    const API_KEY = process.env.USDA_API_KEY;

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
      query
    )}&pageSize=12&api_key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    function getNutrientValue(food, possibleNames) {
      const match = (food.foodNutrients || []).find((n) =>
        possibleNames.includes(n.nutrientName)
      );
      return Number(match?.value) || 0;
    }

    const foods = (data.foods || []).map((food) => ({
      id: food.fdcId,
      name: food.description || "Unknown food",
      brand: food.brandOwner || food.brandName || "USDA",
      calories: getNutrientValue(food, ["Energy", "Energy (kcal)"]),
      protein: getNutrientValue(food, ["Protein"]),
      carbs: getNutrientValue(food, ["Carbohydrate, by difference"]),
      fat: getNutrientValue(food, ["Total lipid (fat)"]),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(foods),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Unknown error",
      }),
    };
  }
}