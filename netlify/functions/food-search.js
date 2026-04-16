import { getFatSecretToken } from "./fatsecret-token.js";
import { removeAccents, parseUSDA, parseOFF, parseFatSecret, deduplicateFoods } from "./food-parsers.js";
import { withCors } from "./_cors.js";

// Admin-only debug mode (triggered by ?debug=1) surfaces per-source
// status so Marios can see in DevTools exactly why a given upstream
// returned 0 hits — token failure, HTTP error, empty payload, etc.
// Without this, failures in the try/catch wrappers get silently
// swallowed and every source looks the same to the user.
export const handler = withCors(async function handler(event) {
  const debugMode = event.queryStringParameters?.debug === "1";
  const debug = { sources: {}, query: null };

  try {
    const query = event.queryStringParameters?.q?.trim();
    debug.query = query;

    if (!query || query.length < 2) {
      return respond([], debug, debugMode);
    }

    const API_KEY = process.env.USDA_API_KEY;
    const queryNoAccents = removeAccents(query);

    // Per-source error capture. Each upstream records its own failure
    // reason; if it stays null we know the fetch succeeded.
    let usdaError = null;
    let offGrError = null;
    let offWorldError = null;
    let fatSecretError = null;
    let fatSecretTokenError = null;

    // USDA
    const usdaPromise = fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${API_KEY}`
    )
      .then(async (res) => {
        if (!res.ok) { usdaError = `HTTP ${res.status}`; return null; }
        return res.json();
      })
      .catch((e) => { usdaError = String(e.message || e).slice(0, 200); return null; });

    // OFF Greek
    const offGrPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&lc=el&cc=gr`
    )
      .then(async (res) => {
        if (!res.ok) { offGrError = `HTTP ${res.status}`; return null; }
        return res.json();
      })
      .catch((e) => { offGrError = String(e.message || e).slice(0, 200); return null; });

    // OFF Greek no accents
    const offGrNoAccentsPromise = queryNoAccents !== query
      ? fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(queryNoAccents)}&search_simple=1&action=process&json=1&page_size=15&lc=el&cc=gr`
        ).then((res) => (res.ok ? res.json() : null)).catch(() => null)
      : Promise.resolve(null);

    // OFF World
    const offWorldPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
    )
      .then(async (res) => {
        if (!res.ok) { offWorldError = `HTTP ${res.status}`; return null; }
        return res.json();
      })
      .catch((e) => { offWorldError = String(e.message || e).slice(0, 200); return null; });

    // FatSecret (token + search)
    const fatSecretPromise = (async () => {
      let token;
      try {
        token = await getFatSecretToken();
        if (!token) { fatSecretTokenError = "Token was empty"; return null; }
      } catch (e) {
        fatSecretTokenError = String(e.message || e).slice(0, 300);
        return null;
      }
      try {
        const res = await fetch(
          `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) { fatSecretError = `HTTP ${res.status}`; return null; }
        const data = await res.json();
        if (data?.error) {
          fatSecretError = `${data.error.code ?? ""}: ${data.error.message ?? JSON.stringify(data.error)}`.slice(0, 300);
          return null;
        }
        return data;
      } catch (e) {
        fatSecretError = String(e.message || e).slice(0, 300);
        return null;
      }
    })();

    // USDA first (blocking)
    const usdaData = await usdaPromise;
    const usdaFoods = parseUSDA(usdaData);
    debug.sources.usda = usdaError
      ? { ok: false, count: 0, error: usdaError }
      : { ok: true, count: usdaFoods.length };

    // Rest with 3s timeout race
    let offFoods = [];
    let fatSecretFoods = [];

    const [offGrData, offGrNoAccentsData, offWorldData, fatSecretData] = await Promise.all([
      Promise.race([offGrPromise, new Promise((r) => setTimeout(() => r("__timeout__"), 3000))]),
      Promise.race([offGrNoAccentsPromise, new Promise((r) => setTimeout(() => r("__timeout__"), 3000))]),
      Promise.race([offWorldPromise, new Promise((r) => setTimeout(() => r("__timeout__"), 3000))]),
      Promise.race([fatSecretPromise, new Promise((r) => setTimeout(() => r("__timeout__"), 3000))]),
    ]);

    const offGrTimedOut = offGrData === "__timeout__";
    const offWorldTimedOut = offWorldData === "__timeout__";
    const fatSecretTimedOut = fatSecretData === "__timeout__";

    const offGrCount = parseOFF(offGrTimedOut ? null : offGrData, "🇬🇷 Greek").length;
    const offWorldCount = parseOFF(offWorldTimedOut ? null : offWorldData, "OpenFood").length;

    offFoods = [
      ...parseOFF(offGrTimedOut ? null : offGrData, "🇬🇷 Greek"),
      ...parseOFF(offGrNoAccentsData === "__timeout__" ? null : offGrNoAccentsData, "🇬🇷 Greek"),
      ...parseOFF(offWorldTimedOut ? null : offWorldData, "OpenFood"),
    ];

    if (!fatSecretTimedOut) {
      fatSecretFoods = parseFatSecret(fatSecretData);
    }

    // Populate debug per source
    debug.sources.offGreek = offGrTimedOut
      ? { ok: false, count: 0, error: "Timeout after 3s" }
      : offGrError
        ? { ok: false, count: 0, error: offGrError }
        : { ok: true, count: offGrCount };

    debug.sources.offWorld = offWorldTimedOut
      ? { ok: false, count: 0, error: "Timeout after 3s" }
      : offWorldError
        ? { ok: false, count: 0, error: offWorldError }
        : { ok: true, count: offWorldCount };

    debug.sources.fatsecret = fatSecretTimedOut
      ? { ok: false, count: 0, error: "Timeout after 3s" }
      : fatSecretTokenError
        ? { ok: false, count: 0, error: `Token: ${fatSecretTokenError}` }
        : fatSecretError
          ? { ok: false, count: 0, error: fatSecretError }
          : { ok: true, count: fatSecretFoods.length };

    const allFoods = deduplicateFoods(fatSecretFoods, offFoods, usdaFoods);
    debug.totalAfterDedupe = allFoods.length;

    return respond(allFoods, debug, debugMode);
  } catch (error) {
    debug.fatalError = String(error.message || error).slice(0, 300);
    return {
      statusCode: 500,
      body: JSON.stringify(
        debugMode ? { error: error.message || "Unknown error", debug } : { error: error.message || "Unknown error" }
      ),
    };
  }
});

function respond(foods, debug, debugMode) {
  return {
    statusCode: 200,
    body: JSON.stringify(debugMode ? { foods, debug } : foods),
  };
}
