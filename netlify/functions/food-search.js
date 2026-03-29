export async function handler(event) {
  try {
    const query = event.queryStringParameters?.q?.trim();

    if (!query || query.length < 2) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          results: []
        })
      };
    }

    const API_KEY = process.env.USDA_API_KEY;

    if (!API_KEY) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Missing USDA_API_KEY environment variable"
        })
      };
    }

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
      query
    )}&pageSize=12&api_key=${encodeURIComponent(API_KEY)}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();

      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "USDA API request failed",
          details: errorText
        })
      };
    }

    const data = await response.json();
    const foodsArray = Array.isArray(data?.foods) ? data.foods : [];

    function getNutrientValue(food, possibleNames) {
      const match = (food.foodNutrients || []).find((n) =>
        possibleNames.includes(n.nutrientName)
      );
      return Number(match?.value) || 0;
    }

    const foods = foodsArray.map((food) => ({
      id: food.fdcId,
      name: food.description || "Unknown food",
      brand: food.brandOwner || food.brandName || "USDA",
      calories: getNutrientValue(food, ["Energy", "Energy (kcal)"]),
      protein: getNutrientValue(food, ["Protein"]),
      carbs: getNutrientValue(food, ["Carbohydrate, by difference"]),
      fat: getNutrientValue(food, ["Total lipid (fat)"])
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        results: foods
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: error.message || "Unknown server error"
      })
    };
  }
}