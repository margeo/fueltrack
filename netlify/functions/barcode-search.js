export async function handler(event) {
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