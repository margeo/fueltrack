// CORS middleware for Netlify functions.
//
// When FuelTrack runs as a web app on fueltrack.me, the browser issues
// same-origin requests to /.netlify/functions/* and CORS is not involved.
//
// When it runs inside a Capacitor native WebView the page is served from
// capacitor://localhost (iOS) or https://localhost (Android), so calls to
// https://fueltrack.me/.netlify/functions/* become cross-origin and the
// browser enforces CORS. Without the headers below the native app sees
// "Failed to fetch" for every function call.
//
// We allow any origin because the JWT-based auth already gates the
// endpoints that need it and the non-auth ones (food-search, barcode,
// new-user-notify) don't expose sensitive data.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Wraps a Netlify function handler so:
//  1. OPTIONS preflight requests return 204 with the CORS headers.
//  2. Every other response has the CORS headers merged in.
export function withCors(handler) {
  return async function corsHandler(event) {
    if (event && event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: "",
      };
    }
    const response = await handler(event);
    return {
      ...response,
      headers: { ...CORS_HEADERS, ...(response && response.headers ? response.headers : {}) },
    };
  };
}
