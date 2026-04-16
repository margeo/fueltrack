import { removeAccents, parseUSDA, parseOFF, parseFatSecret, deduplicateFoods } from "./food-parsers.js";
import { withCors } from "./_cors.js";

export const handler = withCors(async function handler(event) {
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

    // FatSecret — goes through the GreenGeeks static-IP proxy at
    // https://api.fueltrack.me/fatsecret-proxy.php. That proxy holds
    // the OAuth credentials in its own _config.php and talks to
    // FatSecret from the single whitelisted IP 107.6.176.102,
    // bypassing Netlify's dynamic AWS Lambda pool which FatSecret
    // refuses to authorize.
    const fatSecretPromise = (async () => {
      const proxyUrl = process.env.FATSECRET_PROXY_URL;
      const proxySecret = process.env.FATSECRET_PROXY_SECRET;
      if (!proxyUrl || !proxySecret) return null;
      try {
        const res = await fetch(
          `${proxyUrl}?q=${encodeURIComponent(query)}`,
          { headers: { "X-Proxy-Secret": proxySecret } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data && typeof data === "object" && "error" in data) return null;
        return data;
      } catch {
        return null;
      }
    })();

    // USDA first (blocking)
    const usdaData = await usdaPromise;
    const usdaFoods = parseUSDA(usdaData);

    // OFF + FatSecret with 3s timeout
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
        ...parseOFF(offWorldData, "OpenFood"),
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
});
