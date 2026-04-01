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

// netlify/functions/barcode-search.js
var barcode_search_exports = {};
__export(barcode_search_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(barcode_search_exports);
async function handler(event) {
  try {
    const barcode = event.queryStringParameters?.code?.trim();
    if (!barcode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing barcode" })
      };
    }
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    if (!response.ok) {
      throw new Error(`OFF error: ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return {
        statusCode: 200,
        body: JSON.stringify({ found: false })
      };
    }
    const p = data.product;
    const n = p.nutriments || {};
    const food = {
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
    return {
      statusCode: 200,
      body: JSON.stringify(food)
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
//# sourceMappingURL=barcode-search.js.map
