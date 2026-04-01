let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials&scope=basic"
  });

  if (!response.ok) {
    throw new Error(`Token error: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
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

    const token = await getAccessToken();

    const response = await fetch(
      `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=20`,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`FatSecret error: ${response.status}`);
    }

    const data = await response.json();
    const foods = data?.foods?.food || [];
    const foodArray = Array.isArray(foods) ? foods : [foods];

    const results = foodArray.map((food) => {
      const desc = food.food_description || "";
      const caloriesMatch = desc.match(/Calories:\s*([\d.]+)kcal/i);
      const fatMatch = desc.match(/Fat:\s*([\d.]+)g/i);
      const carbsMatch = desc.match(/Carbs:\s*([\d.]+)g/i);
      const proteinMatch = desc.match(/Protein:\s*([\d.]+)g/i);

      return {
        id: `fs-${food.food_id}`,
        source: "fatsecret",
        sourceLabel: "FatSecret",
        name: food.food_name || "Unknown",
        brand: food.brand_name || "",
        caloriesPer100g: caloriesMatch ? Number(caloriesMatch[1]) : 0,
        fatPer100g: fatMatch ? Number(fatMatch[1]) : 0,
        carbsPer100g: carbsMatch ? Number(carbsMatch[1]) : 0,
        proteinPer100g: proteinMatch ? Number(proteinMatch[1]) : 0
      };
    }).filter((food) => food.caloriesPer100g > 0);

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
}