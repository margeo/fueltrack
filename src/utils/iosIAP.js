// iOS in-app purchase wrapper.
//
// Apple App Store Review Guideline 3.1.1 requires subscriptions sold
// in an iOS native app to go through StoreKit — not Stripe Checkout.
// So on iOS we launch StoreKit here; on web and (for now) Android we
// stay on the Stripe path implemented in ./stripe.js.
//
// The native side is a custom Capacitor plugin shipped in the iOS
// project (ios/App/App/NativePurchasesPlugin.swift, see
// docs/ios-native-purchases-replacement/). That plugin registers under
// jsName "NativePurchases" and implements the 4 methods we call below
// against StoreKit 2 directly. We registerPlugin from @capacitor/core
// rather than importing a node package so no npm dependency is
// dragged into the web bundle.
//
// All functions no-op or return null when called off iOS so callers
// can unconditionally import and call them; the platform gate is
// isIosIapAvailable().

import { Capacitor, registerPlugin } from "@capacitor/core";
import { hasNativePlugin } from "./nativeCapabilities";

// registerPlugin returns a proxy that routes JS method calls to whatever
// native module registered itself under jsName "NativePurchases" at WebView
// startup. We implement that native side ourselves in
// ios/App/App/NativePurchasesPlugin.swift (see
// docs/ios-native-purchases-replacement/) because @capgo/native-purchases@8.3.x
// has Swift compile errors against capacitor-swift-pm 8.3.1. The proxy is
// a no-op on web — method calls throw "not implemented" — which is fine
// because every call site is gated by isIosIapAvailable() below.
const NativePurchases = registerPlugin("NativePurchases");

// App Store Connect subscription product id. Must match the Reference
// Name / Product ID configured on the "Monetization → Subscriptions"
// page of the app (see CLAUDE.md).
export const PRO_MONTHLY_PRODUCT_ID = "me.fueltrack.app.pro_monthly";

// True only when running inside the iOS native shell AND the installed
// IPA has the NativePurchases plugin compiled in. Returns false on web
// and false on a stale iOS build that was shipped before we added
// the custom NativePurchasesPlugin.swift — see nativeCapabilities.js
// for how PluginHeaders is consulted.
export function isIosIapAvailable() {
  if (Capacitor.getPlatform() !== "ios") return false;
  if (!Capacitor.isNativePlatform()) return false;
  return hasNativePlugin("NativePurchases");
}

function ensureAvailable() {
  if (!isIosIapAvailable()) {
    throw new Error("NativePurchases plugin is not available on this platform");
  }
}

// Fetches localized product metadata (title, price string, period)
// from the App Store so the UI can show the user "€2.99 / month" in
// their own region's currency/format instead of a hardcoded string.
// Returns null off iOS.
export async function getProMonthlyProduct() {
  if (!isIosIapAvailable()) return null;
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
  ensureAvailable();
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
  ensureAvailable();
  return NativePurchases.restorePurchases();
}

// Opens the iOS Settings → Apple ID → Subscriptions sheet. Apple
// requires this to be reachable from within the app so users can
// cancel/manage a subscription without leaving.
export async function openIosSubscriptionManagement() {
  ensureAvailable();
  return NativePurchases.manageSubscriptions();
}
