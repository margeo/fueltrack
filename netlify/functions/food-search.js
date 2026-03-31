function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function dedupeFoods(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${normalizeText(item.name)}|${normalizeText(item.brand)}`;
    if (!item.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSearchScore(item, query) {
  const q = normalizeText(query);
  const name = normalizeText(item.name);
  const brand = normalizeText(item.brand);
  const combined = `${name} ${brand}`.trim();

  let score = 0;

  if (name === q) score += 120;
  if (combined === q) score += 110;
  if (name.startsWith(q)) score += 80;
  if (brand.startsWith(q)) score += 30;
  if (name.includes(q)) score += 45;
  if (combined.includes(q)) score += 20;

  if (item.source === "usda") score += 10;
  if (item.source === "off") score += 8;

  return score;
}

async function searchUSDA(query, apiKey) {
  if (!apiKey) return [];

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
    query
  )}&pageSize=12&api_key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`USDA search failed: ${response.status}`);
  }

  const data = await response.json();

  function getNutrientValue(food, possibleNames) {
    const match = (food.foodNutrients || []).find((n) =>
      possibleNames.includes(n.nutrientName)
    );
    return Number(match?.value) || 0;
  }

  return (data.foods || []).map((food) => ({
    id: `usda-${food.fdcId}`,
    source: "usda",
    sourceLabel: "USDA",
    name: food.description || "Unknown food",
    brand: food.brandOwner || food.brandName || "USDA",
    caloriesPer100g: getNutrientValue(food, ["Energy", "Energy (kcal)"]),
    proteinPer100g: getNutrientValue(food, ["Protein"]),
    carbsPer100g: getNutrientValue(food, ["Carbohydrate, by difference"]),
    fatPer100g: getNutrientValue(food, ["Total lipid (fat)"])
  }));
}

async function searchOpenFoodFacts(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=12`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "FuelTrack/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Open Food Facts search failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.products || [])
    .map((product) => ({
      id: `off-${product.code || product.id || product._id || Math.random()}`,
      source: "off",
      sourceLabel: "Open Food Facts",
      name: product.product_name || product.generic_name || product.abbreviated_product_name || "",
      brand: product.brands || "",
      caloriesPer100g: safeNumber(product.nutriments?.["energy-kcal_100g"]),
      proteinPer100g: safeNumber(product.nutriments?.proteins_100g),
      carbsPer100g: safeNumber(product.nutriments?.carbohydrates_100g),
      fatPer100g: safeNumber(product.nutriments?.fat_100g)
    }))
    .filter((item) => item.name);
}

export async function handler(event) {
  try {
    const query = event.queryStringParameters?.q?.trim();

    if (!query || query.length < 2) {
      return {
        statusCode: 200,
        body: JSON.stringify([])
      };
    }

    const apiKey = process.env.USDA_API_KEY;

    const [usdaResult, offResult] = await Promise.allSettled([
      searchUSDA(query, apiKey),
      searchOpenFoodFacts(query)
    ]);

    const usdaFoods = usdaResult.status === "fulfilled" ? usdaResult.value : [];
    const offFoods = offResult.status === "fulfilled" ? offResult.value : [];

    const foods = dedupeFoods([...usdaFoods, ...offFoods]).sort((a, b) => {
      const aScore = getSearchScore(a, query);
      const bScore = getSearchScore(b, query);
      return bScore - aScore;
    });

    return {
      statusCode: 200,
      body: JSON.stringify(foods)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Unknown error"
      })
    };
  }
}