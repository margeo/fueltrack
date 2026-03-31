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

    // USDA
    const usdaPromise = fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=15&api_key=${API_KEY}`
    ).then((res) => res.json()).catch(() => null);

    // Open Food Facts - Greek products
    const offGrPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&lc=el&cc=gr`
    ).then((res) => res.json()).catch(() => null);

    // Open Food Facts - Global
    const offWorldPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
    ).then((res) => res.json()).catch(() => null);

    // Περιμένουμε USDA πρώτα
    const usdaData = await usdaPromise;

    function getNutrientValue(food, possibleNames) {
      const match = (food.foodNutrients || []).find((n) =>
        possibleNames.includes(n.nutrientName)
      );
      return Number(match?.value) || 0;
    }

    const usdaFoods = (usdaData?.foods || []).map((food) => ({
      id: `usda-${food.fdcId}`,
      source: "usda",
      sourceLabel: "USDA",
      name: food.description || "Unknown food",
      brand: food.brandOwner || food.brandName || "",
      caloriesPer100g: getNutrientValue(food, ["Energy", "Energy (kcal)"]),
      proteinPer100g: getNutrientValue(food, ["Protein"]),
      carbsPer100g: getNutrientValue(food, ["Carbohydrate, by difference"]),
      fatPer100g: getNutrientValue(food, ["Total lipid (fat)"]),
    }));

    // OFF με timeout 2000ms
    let offFoods = [];

    try {
      const [offGrData, offWorldData] = await Promise.all([
        Promise.race([offGrPromise, new Promise((resolve) => setTimeout(() => resolve(null), 2000))]),
        Promise.race([offWorldPromise, new Promise((resolve) => setTimeout(() => resolve(null), 2000))]),
      ]);

      const parseOFF = (data, label) => {
        if (!data?.products) return [];
        return data.products
          .filter((p) => p.product_name && Number(p.nutriments?.["energy-kcal_100g"] || 0) > 0)
          .map((p) => ({
            id: `off-${p.code}`,
            source: "off",
            sourceLabel: label,
            name: p.product_name_el || p.product_name || "Unknown",
            brand: p.brands || "",
            caloriesPer100g: Number(p.nutriments?.["energy-kcal_100g"] || 0),
            proteinPer100g: Number(p.nutriments?.proteins_100g || 0),
            carbsPer100g: Number(p.nutriments?.carbohydrates_100g || 0),
            fatPer100g: Number(p.nutriments?.fat_100g || 0),
          }));
      };

      const grFoods = parseOFF(offGrData, "🇬🇷 Greek");
      const worldFoods = parseOFF(offWorldData, "OpenFood");

      // Ελληνικά πρώτα
      offFoods = [...grFoods, ...worldFoods];

    } catch {
      // ignore
    }

    // Deduplicate OFF
    const seen = new Set();
    const dedupedOff = offFoods.filter((f) => {
      const key = `${f.name.toLowerCase()}|${f.brand.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const results = [...usdaFoods, ...dedupedOff];

    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
}