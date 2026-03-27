export default async (req, context) => {
  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("q") || "").trim();

    if (query.length < 2) {
      return jsonResponse({ foods: [] }, 200);
    }

    const apiKey = process.env.USDA_API_KEY;

    if (!apiKey) {
      return jsonResponse(
        { error: "Missing USDA_API_KEY", foods: [] },
        500
      );
    }

    const usdaUrl = "https://api.nal.usda.gov/fdc/v1/foods/search";

    const response = await fetch(usdaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        pageSize: 12,
        api_key: apiKey,
        dataType: ["Foundation", "SR Legacy", "Branded"]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return jsonResponse(
        { error: "USDA request failed", details: text, foods: [] },
        500
      );
    }

    const data = await response.json();
    const foods = Array.isArray(data.foods) ? data.foods : [];

    const mapped = foods
      .map(mapUsdaFood)
      .filter(Boolean)
      .slice(0, 12);

    return jsonResponse({ foods: mapped }, 200);

  } catch (error) {
    return jsonResponse(
      {
        error: "Function error",
        details: error.message,
        foods: []
      },
      500
    );
  }
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function mapUsdaFood(food) {
  if (!food) return null;

  const nutrients = food.foodNutrients || [];

  const calories = getNutrient(nutrients, ["Energy"], [1008]) || 0;
  const protein = getNutrient(nutrients, ["Protein"], [1003]) || 0;
  const carbs = getNutrient(nutrients, ["Carbohydrate, by difference"], [1005]) || 0;
  const fat = getNutrient(nutrients, ["Total lipid (fat)"], [1004]) || 0;

  return {
    id: `usda-${food.fdcId}`,
    source: "usda",
    name: food.description || "Unknown",
    brand: food.brandOwner || "",
    caloriesPer100g: Math.round(calories * 10) / 10,
    proteinPer100g: Math.round(protein * 10) / 10,
    carbsPer100g: Math.round(carbs * 10) / 10,
    fatPer100g: Math.round(fat * 10) / 10
  };
}

function getNutrient(nutrients, names, numbers) {
  for (const n of nutrients) {
    const name = n.nutrientName || n.name || "";
    const number = Number(n.nutrientNumber || n.number);

    if (names.includes(name) || numbers.includes(number)) {
      const value = n.value ?? n.amount;
      if (value !== undefined) return Number(value);
    }
  }
  return null;
}
