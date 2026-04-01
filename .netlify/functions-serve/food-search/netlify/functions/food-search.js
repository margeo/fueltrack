var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/food-search.js
var food_search_exports = {};
__export(food_search_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(food_search_exports);
function removeAccents(str) {
  return str.replace(/ά/g, "\u03B1").replace(/έ/g, "\u03B5").replace(/ή/g, "\u03B7").replace(/ί/g, "\u03B9").replace(/ό/g, "\u03BF").replace(/ύ/g, "\u03C5").replace(/ώ/g, "\u03C9").replace(/ϊ/g, "\u03B9").replace(/ϋ/g, "\u03C5").replace(/ΐ/g, "\u03B9").replace(/ΰ/g, "\u03C5").replace(/Ά/g, "\u0391").replace(/Έ/g, "\u0395").replace(/Ή/g, "\u0397").replace(/Ί/g, "\u0399").replace(/Ό/g, "\u039F").replace(/Ύ/g, "\u03A5").replace(/Ώ/g, "\u03A9");
}
async function handler(event) {
  try {
    let getNutrientValue = function(food, possibleNames) {
      const match = (food.foodNutrients || []).find(
        (n) => possibleNames.includes(n.nutrientName)
      );
      return Number(match?.value) || 0;
    };
    const query = event.queryStringParameters?.q?.trim();
    if (!query || query.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }
    const API_KEY = process.env.USDA_API_KEY;
    const queryNoAccents = removeAccents(query);
    const usdaPromise = fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=15&api_key=${API_KEY}`
    ).then((res) => res.json()).catch(() => null);
    const offGrPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&lc=el&cc=gr`
    ).then((res) => res.json()).catch(() => null);
    const offGrNoAccentsPromise = queryNoAccents !== query ? fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(queryNoAccents)}&search_simple=1&action=process&json=1&page_size=20&lc=el&cc=gr`
    ).then((res) => res.json()).catch(() => null) : Promise.resolve(null);
    const offWorldPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15`
    ).then((res) => res.json()).catch(() => null);
    const usdaData = await usdaPromise;
    const usdaFoods = (usdaData?.foods || []).map((food) => ({
      id: `usda-${food.fdcId}`,
      source: "usda",
      sourceLabel: "USDA",
      name: food.description || "Unknown food",
      brand: food.brandOwner || food.brandName || "",
      caloriesPer100g: getNutrientValue(food, ["Energy", "Energy (kcal)"]),
      proteinPer100g: getNutrientValue(food, ["Protein"]),
      carbsPer100g: getNutrientValue(food, ["Carbohydrate, by difference"]),
      fatPer100g: getNutrientValue(food, ["Total lipid (fat)"])
    }));
    let offFoods = [];
    try {
      const [offGrData, offGrNoAccentsData, offWorldData] = await Promise.all([
        Promise.race([offGrPromise, new Promise((r) => setTimeout(() => r(null), 3e3))]),
        Promise.race([offGrNoAccentsPromise, new Promise((r) => setTimeout(() => r(null), 3e3))]),
        Promise.race([offWorldPromise, new Promise((r) => setTimeout(() => r(null), 3e3))])
      ]);
      const parseOFF = (data, label) => {
        if (!data?.products) return [];
        return data.products.filter((p) => p.product_name && Number(p.nutriments?.["energy-kcal_100g"] || 0) > 0).map((p) => ({
          id: `off-${p.code}`,
          source: "off",
          sourceLabel: label,
          name: p.product_name_el || p.product_name || "Unknown",
          brand: p.brands || "",
          caloriesPer100g: Number(p.nutriments?.["energy-kcal_100g"] || 0),
          proteinPer100g: Number(p.nutriments?.proteins_100g || 0),
          carbsPer100g: Number(p.nutriments?.carbohydrates_100g || 0),
          fatPer100g: Number(p.nutriments?.fat_100g || 0)
        }));
      };
      const grFoods = parseOFF(offGrData, "\u{1F1EC}\u{1F1F7} Greek");
      const grNoAccentFoods = parseOFF(offGrNoAccentsData, "\u{1F1EC}\u{1F1F7} Greek");
      const worldFoods = parseOFF(offWorldData, "OpenFood");
      offFoods = [...grFoods, ...grNoAccentFoods, ...worldFoods];
    } catch {
    }
    const seen = /* @__PURE__ */ new Set();
    const allFoods = [...usdaFoods, ...offFoods].filter((f) => {
      const key = `${String(f.name || "").trim().toLowerCase()}|${String(f.brand || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      statusCode: 200,
      body: JSON.stringify(allFoods)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=food-search.js.map
