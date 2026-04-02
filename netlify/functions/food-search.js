import { getFatSecretToken } from "./fatsecret-token.js";

function removeAccents(str) {
  return str
    .replace(/ά/g, "α").replace(/έ/g, "ε").replace(/ή/g, "η")
    .replace(/ί/g, "ι").replace(/ό/g, "ο").replace(/ύ/g, "υ")
    .replace(/ώ/g, "ω").replace(/ϊ/g, "ι").replace(/ϋ/g, "υ")
    .replace(/ΐ/g, "ι").replace(/ΰ/g, "υ").replace(/Ά/g, "Α")
    .replace(/Έ/g, "Ε").replace(/Ή/g, "Η").replace(/Ί/g, "Ι")
    .replace(/Ό/g, "Ο").replace(/Ύ/g, "Υ").replace(/Ώ/g, "Ω");
}

export async function handler(event) {
  try {
    const query = event.queryStringParameters?.q?.trim();

    if (!query || query.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const API_KEY = process.env.USDA_API_KEY;
    const queryNoAccents = removeAccents(query);

    // USDA
    const usdaPromise = fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${API_KEY}`
    ).then((res) => res.json()).catch(() => null);

    // OFF Greek
    const offGrPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&lc=el&cc=gr`
    ).then((res) => res.json()).catch(() => null);

    // OFF Greek no accents
    const offGrNoAccentsPromise = queryNoAccents !== query
      ? fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(queryNoAccents)}&search_simple=1&action=process&json=1&page_size=15&lc=el&cc=gr`
        ).then((res) => res.json()).catch(() => null)
      : Promise.resolve(null);

    // OFF World
    const offWorldPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
    ).then((res) => res.json()).catch(() => null);

    // FatSecret
    const fatSecretPromise = (async () => {
      try {
        const token = await getFatSecretToken();
        const res = await fetch(
          `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return await res.json();
      } catch { return null; }
    })();

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

    // OFF + FatSecret με timeout
    let offFoods = [];
    let fatSecretFoods = [];

    try {
      const [offGrData, offGrNoAccentsData, offWorldData, fatSecretData] = await Promise.all([
        Promise.race([offGrPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
        Promise.race([offGrNoAccentsPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
        Promise.race([offWorldPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
        Promise.race([fatSecretPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
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

      offFoods = [
        ...parseOFF(offGrData, "🇬🇷 Greek"),
        ...parseOFF(offGrNoAccentsData, "🇬🇷 Greek"),
        ...parseOFF(offWorldData, "OpenFood")
      ];

      // Parse FatSecret
      if (fatSecretData?.foods?.food) {
        const foods = Array.isArray(fatSecretData.foods.food)
          ? fatSecretData.foods.food
          : [fatSecretData.foods.food];

        fatSecretFoods = foods
          .filter((f) => f.food_name)
          .map((f) => {
            const desc = f.food_description || "";
            const calMatch = desc.match(/Calories:\s*([\d.]+)kcal/i);
            const fatMatch = desc.match(/Fat:\s*([\d.]+)g/i);
            const carbMatch = desc.match(/Carbs:\s*([\d.]+)g/i);
            const protMatch = desc.match(/Protein:\s*([\d.]+)g/i);

            return {
              id: `fs-${f.food_id}`,
              source: "fatsecret",
              sourceLabel: "FatSecret",
              name: f.food_name,
              brand: f.brand_name || "",
              caloriesPer100g: Number(calMatch?.[1] || 0),
              proteinPer100g: Number(protMatch?.[1] || 0),
              carbsPer100g: Number(carbMatch?.[1] || 0),
              fatPer100g: Number(fatMatch?.[1] || 0),
            };
          })
          .filter((f) => f.caloriesPer100g > 0);
      }
    } catch { /* ignore */ }

    // Deduplicate — FatSecret πρώτο για ελληνικά
    const seen = new Set();
    const allFoods = [...fatSecretFoods, ...offFoods, ...usdaFoods].filter((f) => {
      const key = `${String(f.name || "").trim().toLowerCase()}|${String(f.brand || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      statusCode: 200,
      body: JSON.stringify(allFoods),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
}