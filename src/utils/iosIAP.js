// iOS in-app purchase wrapper around @capgo/native-purchases.
//
// Apple App Store Review Guideline 3.1.1 requires subscriptions sold
// in an iOS native app to go through StoreKit — not Stripe Checkout.
// So on iOS we launch StoreKit here; on web and (for now) Android we
// stay on the Stripe path implemented in ./stripe.js.
//
// All functions no-op or return null when called off iOS so callers
// can unconditionally import and call them; the platform gate is
// isIosIapAvailable().

import { Capacitor } from "@capacitor/core";
import { hasNativePlugin } from "./nativeCapabilities";

// App Store Connect subscription product id. Must match the Reference
// Name / Product ID configured on the "Monetization → Subscriptions"
// page of the app (see CLAUDE.md).
export const PRO_MONTHLY_PRODUCT_ID = "me.fueltrack.app.pro_monthly";

// True only when running inside the iOS native shell AND the installed
// IPA has the NativePurchases plugin compiled in. Returns false on web
// and false on a stale iOS build that was shipped before we added
// @capgo/native-purchases — see nativeCapabilities.js for how
// PluginHeaders is consulted.
export function isIosIapAvailable() {
  if (Capacitor.getPlatform() !== "ios") return false;
  if (!Capacitor.isNativePlatform()) return false;
  return hasNativePlugin("NativePurchases");
}

// Lazy import so the StoreKit wrapper isn't dragged into the web
// bundle — web users don't need it and Vite won't split it out of the
// main chunk otherwise. Throws if called when isIosIapAvailable() is
// false so platform bugs surface loudly instead of silently invoking
// the plugin's throwing web fallback.
async function getPlugin() {
  if (!isIosIapAvailable()) {
    throw new Error("NativePurchases plugin is not available on this platform");
  }
  const mod = await import("@capgo/native-purchases");
  return mod.NativePurchases;
}

// Fetches localized product metadata (title, price string, period)
// from the App Store so the UI can show the user "€2.99 / month" in
// their own region's currency/format instead of a hardcoded string.
// Returns null off iOS.
export async function getProMonthlyProduct() {
  if (!isIosIapAvailable()) return null;
  const NativePurchases = await getPlugin();
  const res = await NativePurchases.getProducts({
    productIdentifiers: [PRO_MONTHLY_PRODUCT_ID],
  });
  return res?.products?.[0] ?? null;
}

// Runs the StoreKit 2 purchase flow. `appAccountToken` MUST be a UUID
// (StoreKit 2 requirement); we pass the Supabase user id so the
// resulting transaction carries the FuelTrack user id as metadata
// readable server-side in App Store Server API v2 and in App Store
// Server Notifications v2. Returns the full Transaction object
// including jwsRepresentation which the backend uses for verification.
export async function purchaseProMonthly(supabaseUserId) {
  const NativePurchases = await getPlugin();
  return NativePurchases.purchaseProduct({
    productIdentifier: PRO_MONTHLY_PRODUCT_ID,
    productType: "subs",
    ...(supabaseUserId ? { appAccountToken: supabaseUserId } : {}),
  });
}

// Asks StoreKit to resurface any non-consumable / subscription
// purchases the signed-in Apple ID already owns (new install, new
// device, family-shared). Returns the list of transactions; the
// caller should POST any valid ones to the backend receipt validator
// to reactivate is_paid.
export async function restorePurchases() {
  const NativePurchases = await getPlugin();
  return NativePurchases.restorePurchases();
}

// Opens the iOS Settings → Apple ID → Subscriptions sheet. Apple
// requires this to be reachable from within the app so users can
// cancel/manage a subscription without leaving.
export async function openIosSubscriptionManagement() {
  const NativePurchases = await getPlugin();
  return NativePurchases.manageSubscriptions();
}
