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

    // 🔥 USDA (κύριο - γρήγορο)
    const usdaPromise = fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
        query
      )}&pageSize=10&api_key=${API_KEY}`
    ).then((res) => res.json());

    // 🔥 Open Food Facts (secondary - μπορεί να αργήσει)
    const offPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&action=process&json=1&page_size=10`
    )
      .then((res) => res.json())
      .catch(() => null); // αν fail → ignore

    // 👉 ΠΕΡΙΜΕΝΟΥΜΕ ΜΟΝΟ USDA
    const usdaData = await usdaPromise;

    function getNutrientValue(food, possibleNames) {
      const match = (food.foodNutrients || []).find((n) =>
        possibleNames.includes(n.nutrientName)
      );
      return Number(match?.value) || 0;
    }

    const usdaFoods = (usdaData.foods || []).map((food) => ({
      id: `usda-${food.fdcId}`,
      source: "usda",
      sourceLabel: "USDA",
      name: food.description || "Unknown food",
      brand: food.brandOwner || food.brandName || "USDA",
      caloriesPer100g: getNutrientValue(food, ["Energy", "Energy (kcal)"]),
      proteinPer100g: getNutrientValue(food, ["Protein"]),
      carbsPer100g: getNutrientValue(food, [
        "Carbohydrate, by difference",
      ]),
      fatPer100g: getNutrientValue(food, ["Total lipid (fat)"]),
    }));

    // 👉 Προσπαθούμε να πάρουμε OFF αλλά δεν περιμένουμε
    let offFoods = [];

    try {
      const offData = await Promise.race([
        offPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 800)), // timeout 800ms
      ]);

      if (offData?.products) {
        offFoods = offData.products.map((p) => ({
          id: `off-${p.code}`,
          source: "off",
          sourceLabel: "OpenFood",
          name: p.product_name || "Unknown",
          brand: p.brands || "",
          caloriesPer100g: Number(
            p.nutriments?.["energy-kcal_100g"] || 0
          ),
          proteinPer100g: Number(p.nutriments?.proteins_100g || 0),
          carbsPer100g: Number(p.nutriments?.carbohydrates_100g || 0),
          fatPer100g: Number(p.nutriments?.fat_100g || 0),
        }));
      }
    } catch {
      // ignore completely
    }

    // 🔥 ΕΝΩΝΟΥΜΕ
    const results = [...usdaFoods, ...offFoods];

    return {
      statusCode: 200,
      body: JSON.stringify(results),
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