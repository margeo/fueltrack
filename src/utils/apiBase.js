// Resolves API URLs for both web and Capacitor native runtimes.
//
// On web, relative URLs like "/.netlify/functions/foo" work as expected
// because the browser resolves them against the current origin
// (fueltrack.me or a deploy preview URL).
//
// Inside a Capacitor native app the WebView loads from
// capacitor://localhost (iOS) or https://localhost (Android), so the
// same relative URL would try to hit localhost and fail. For native
// runs we prepend an absolute base URL pointing at the production
// backend so the same code path keeps working.

import { Capacitor } from "@capacitor/core";

// Absolute origin used when the app runs inside a Capacitor native
// container. Web keeps using relative URLs (empty base).
const NATIVE_API_BASE = "https://fueltrack.me";

export const API_BASE = Capacitor.isNativePlatform() ? NATIVE_API_BASE : "";

// Prepends API_BASE to a relative path. Absolute URLs are returned
// unchanged so callers can safely pass either form.
export function apiUrl(path) {
  if (typeof path !== "string") return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}
