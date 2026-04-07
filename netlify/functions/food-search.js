import { getFatSecretToken } from "./fatsecret-token.js";
import { removeAccents, parseUSDA, parseOFF, parseFatSecret, deduplicateFoods } from "./food-parsers.js";

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
    const usdaFoods = parseUSDA(usdaData);

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

      offFoods = [
        ...parseOFF(offGrData, "🇬🇷 Greek"),
        ...parseOFF(offGrNoAccentsData, "🇬🇷 Greek"),
        ...parseOFF(offWorldData, "OpenFood")
      ];

      fatSecretFoods = parseFatSecret(fatSecretData);
    } catch { /* ignore */ }

    const allFoods = deduplicateFoods(fatSecretFoods, offFoods, usdaFoods);

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