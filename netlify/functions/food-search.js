function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function scoreFood(query, item) {
  const q = normalizeText(query);
  const name = normalizeText(item.name);
  const brand = normalizeText(item.brand);

  let score = 0;

  if (!q) return score;

  if (name === q) score += 120;
  if (name.startsWith(q)) score += 60;
  if (name.includes(q)) score += 30;

  if (brand === q) score += 20;
  if (brand.startsWith(q)) score += 10;
  if (brand.includes(q)) score += 5;

  if (item.verified) score += 10;
  if (item.brand && item.brand !== item.sourceLabel) score += 4;

  const hasMacros =
    item.caloriesPer100g > 0 ||
    item.proteinPer100g > 0 ||
    item.carbsPer100g > 0 ||
    item.fatPer100g > 0;

  if (hasMacros) score += 8;

  if (item.source === "local") score += 6;
  if (item.source === "usda") score += 5;
  if (item.source === "edamam") score += 4;
  if (item.source === "off") score += 2;

  return score;
}

function dedupeFoods(items) {
  const map = new Map();

  for (const item of items) {
    const key = `${normalizeText(item.name)}|${normalizeText(item.brand)}`;

    if (!map.has(key)) {
      map.set(key, item);
      continue;
    }

    const existing = map.get(key);
    const existingScore = numberOrZero(existing.searchScore);
    const nextScore = numberOrZero(item.searchScore);

    if (nextScore > existingScore) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

function getUsdNutrientValue(food, possibleNames = []) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  const match = nutrients.find((n) => possibleNames.includes(n?.nutrientName));
  return numberOrZero(match?.value);
}

function normalizeUsdaFoods(query, foodsArray) {
  return foodsArray.map((food) => {
    const item = {
      id: `usda-${food.fdcId}`,
      source: "usda",
      sourceLabel: "USDA",
      name: food.description || "Unknown food",
      brand: food.brandOwner || food.brandName || "USDA",
      caloriesPer100g: getUsdNutrientValue(food, ["Energy", "Energy (kcal)"]),
      proteinPer100g: getUsdNutrientValue(food, ["Protein"]),
      carbsPer100g: getUsdNutrientValue(food, ["Carbohydrate, by difference"]),
      fatPer100g: getUsdNutrientValue(food, ["Total lipid (fat)"]),
      servingLabel: "100g",
      verified: true
    };

    return {
      ...item,
      searchScore: scoreFood(query, item)
    };
  });
}

function normalizeOffFoods(query, productsArray) {
  return productsArray
    .map((product) => {
      const nutriments = product?.nutriments || {};

      const item = {
        id: `off-${product.code || product.id || Math.random().toString(36).slice(2)}`,
        source: "off",
        sourceLabel: "Open Food",
        name:
          product.product_name ||
          product.product_name_en ||
          product.generic_name ||
          "Unknown food",
        brand: product.brands || "Open Food Facts",
        caloriesPer100g: numberOrZero(
          nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"]
        ),
        proteinPer100g: numberOrZero(nutriments.proteins_100g),
        carbsPer100g: numberOrZero(nutriments.carbohydrates_100g),
        fatPer100g: numberOrZero(nutriments.fat_100g),
        servingLabel: "100g",
        verified: Boolean(product.code)
      };

      return {
        ...item,
        searchScore: scoreFood(query, item)
      };
    })
    .filter((item) => item.name && item.name !== "Unknown food");
}

function normalizeEdamamFoods(query, hintsArray) {
  return hintsArray
    .map((hint, index) => {
      const food = hint?.food || {};
      const nutrients = food.nutrients || {};

      const item = {
        id: `edamam-${food.foodId || index}`,
        source: "edamam",
        sourceLabel: "Edamam",
        name: food.label || "Unknown food",
        brand: food.brand || food.categoryLabel || food.category || "Edamam",
        caloriesPer100g: numberOrZero(nutrients.ENERC_KCAL),
        proteinPer100g: numberOrZero(nutrients.PROCNT),
        carbsPer100g: numberOrZero(nutrients.CHOCDF),
        fatPer100g: numberOrZero(nutrients.FAT),
        servingLabel: "100g",
        verified: Boolean(food.foodId)
      };

      return {
        ...item,
        searchScore: scoreFood(query, item)
      };
    })
    .filter((item) => item.name && item.name !== "Unknown food");
}

async function searchUsda(query, apiKey) {
  if (!apiKey) return [];

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
    query
  )}&pageSize=12&api_key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`USDA request failed with status ${response.status}`);
  }

  const data = await response.json();
  const foodsArray = Array.isArray(data?.foods) ? data.foods : [];
  return normalizeUsdaFoods(query, foodsArray);
}

async function searchOpenFoodFacts(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=12`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open Food Facts request failed with status ${response.status}`);
  }

  const data = await response.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  return normalizeOffFoods(query, products);
}

async function searchEdamam(query, appId, appKey) {
  if (!appId || !appKey) return [];

  const url =
    `https://api.edamam.com/api/food-database/v2/parser` +
    `?ingr=${encodeURIComponent(query)}` +
    `&app_id=${encodeURIComponent(appId)}` +
    `&app_key=${encodeURIComponent(appKey)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Edamam request failed with status ${response.status}`);
  }

  const data = await response.json();
  const hints = Array.isArray(data?.hints) ? data.hints : [];
  return normalizeEdamamFoods(query, hints);
}

export async function handler(event) {
  try {
    const query = event.queryStringParameters?.q?.trim() || "";

    if (query.length < 2) {
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

    const USDA_API_KEY = process.env.USDA_API_KEY;
    const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
    const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;

    const [usdaResults, offResults, edamamResults] = await Promise.all([
      searchUsda(query, USDA_API_KEY).catch((error) => {
        console.error("USDA error:", error.message);
        return [];
      }),
      searchOpenFoodFacts(query).catch((error) => {
        console.error("Open Food Facts error:", error.message);
        return [];
      }),
      searchEdamam(query, EDAMAM_APP_ID, EDAMAM_APP_KEY).catch((error) => {
        console.error("Edamam error:", error.message);
        return [];
      })
    ]);

    const merged = [...usdaResults, ...offResults, ...edamamResults];

    const finalResults = dedupeFoods(merged)
      .sort((a, b) => numberOrZero(b.searchScore) - numberOrZero(a.searchScore))
      .slice(0, 24);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300"
      },
      body: JSON.stringify({
        results: finalResults
      })
    };
  } catch (error) {
    console.error("food-search handler error:", error);

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