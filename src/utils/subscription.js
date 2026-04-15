// Platform-aware subscription dispatcher.
//
// Hides the web vs iOS split (Stripe vs Apple StoreKit) behind a
// single surface the UI components call. Android currently also goes
// through Stripe; once we add Play Billing this file is the only
// place that needs to change.
//
// Why a dispatcher rather than branching inside each component: the
// Pro CTA shows up in at least three places (AiLimitLock, PlanChooser,
// ProfileTab). Duplicating the "on iOS, call the plugin; otherwise
// open Stripe Checkout" logic in each of them guarantees one of them
// drifts. Centralize it here.

import { openCheckout, openCustomerPortal } from "./stripe";
import { authedFetch } from "./authFetch";
import { supabase } from "../supabaseClient";
import {
  isIosIapAvailable,
  purchaseProMonthly,
  openIosSubscriptionManagement,
} from "./iosIAP";

// Starts the "upgrade to Pro" purchase flow for the current platform.
//
// Returns { started, paid }:
//   started — native purchase flow launched (iOS) or Stripe Checkout
//             tab opened (web/Android). False only if the user is not
//             signed in.
//   paid    — true only on iOS after StoreKit confirmed the purchase
//             AND our backend validated the JWS. Stripe is webhook-
//             driven and asynchronous, so paid stays false on the
//             web path even on success — caller should show a
//             "subscription activating…" state and poll profiles.
export async function startProMonthlyPurchase() {
  if (isIosIapAvailable()) {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return { started: false, paid: false };

    const transaction = await purchaseProMonthly(userId);

    // Pass the StoreKit-signed JWS to the backend for verification
    // with App Store Server API v2. The backend decodes & verifies
    // the JWS, extracts the originalTransactionId, and sets
    // profiles.is_paid = true + subscription_source = 'ios'.
    const jws = transaction?.jwsRepresentation;
    if (!jws) {
      throw new Error("Missing verified StoreKit JWS on transaction");
    }
    const res = await authedFetch("/.netlify/functions/ios-validate-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jws,
        productId: transaction.productIdentifier,
        transactionId: transaction.transactionId,
      }),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Receipt validation failed (${res.status}): ${errorText}`);
    }
    return { started: true, paid: true };
  }

  // Stripe path — web today, Android today; eventually Android will
  // branch off to Play Billing and live its own native-IAP life.
  await openCheckout();
  return { started: true, paid: false };
}

// Opens the correct management surface for an existing subscription.
//
// source: 'ios' | 'stripe' | 'android' | null — the value of
//         profiles.subscription_source for the signed-in user. When
//         null (legacy pre-iOS paid user) we fall back to the Stripe
//         portal, which is where every existing paying user bought.
export async function openManageSubscription(source) {
  if (source === "ios") {
    await openIosSubscriptionManagement();
    return;
  }
  await openCustomerPortal();
}
