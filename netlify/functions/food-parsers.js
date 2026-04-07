// Extracted parsing logic from food-search.js for testability

export function removeAccents(str) {
  return str
    .replace(/ά/g, "α").replace(/έ/g, "ε").replace(/ή/g, "η")
    .replace(/ί/g, "ι").replace(/ό/g, "ο").replace(/ύ/g, "υ")
    .replace(/ώ/g, "ω").replace(/ϊ/g, "ι").replace(/ϋ/g, "υ")
    .replace(/ΐ/g, "ι").replace(/ΰ/g, "υ").replace(/Ά/g, "Α")
    .replace(/Έ/g, "Ε").replace(/Ή/g, "Η").replace(/Ί/g, "Ι")
    .replace(/Ό/g, "Ο").replace(/Ύ/g, "Υ").replace(/Ώ/g, "Ω");
}

export function getNutrientValue(food, possibleNames) {
  const match = (food.foodNutrients || []).find((n) =>
    possibleNames.includes(n.nutrientName)
  );
  return Number(match?.value) || 0;
}

export function parseUSDA(usdaData) {
  return (usdaData?.foods || []).map((food) => ({
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
}

export function parseOFF(data, label) {
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
}

export function parseFatSecret(fatSecretData) {
  if (!fatSecretData?.foods?.food) return [];

  const foods = Array.isArray(fatSecretData.foods.food)
    ? fatSecretData.foods.food
    : [fatSecretData.foods.food];

  return foods
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

export function deduplicateFoods(fatSecretFoods, offFoods, usdaFoods) {
  const seen = new Set();
  return [...fatSecretFoods, ...offFoods, ...usdaFoods].filter((f) => {
    const key = `${String(f.name || "").trim().toLowerCase()}|${String(f.brand || "").trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseBarcode(data, barcode) {
  if (data.status !== 1 || !data.product) {
    return { found: false };
  }

  const p = data.product;
  const n = p.nutriments || {};

  return {
    found: true,
    id: `off-${barcode}`,
    source: "off",
    sourceLabel: "OpenFood",
    name: p.product_name_el || p.product_name || "Unknown",
    brand: p.brands || "",
    caloriesPer100g: Number(n["energy-kcal_100g"] || 0),
    proteinPer100g: Number(n.proteins_100g || 0),
    carbsPer100g: Number(n.carbohydrates_100g || 0),
    fatPer100g: Number(n.fat_100g || 0),
    image: p.image_front_small_url || ""
  };
}
