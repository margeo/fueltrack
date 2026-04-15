// App Store Server Notifications v2 webhook.
//
// Apple POSTs here on every subscription lifecycle event (renewal,
// cancel, refund, grace period, revoke, etc.). We verify the signed
// payload with Apple's official library and flip profiles.is_paid
// based on the notification type, looking the user up by the stable
// ios_original_transaction_id column populated when the purchase was
// first activated.
//
// Apple expects HTTP 200 within a few seconds even for events we
// can't process (otherwise Apple retries). Any terminal validation
// failure is logged but still returned as 200 so Apple doesn't keep
// retrying a bad payload forever.
//
// Apple Dashboard setup:
//   App Store Connect → App → App Information → App Store Server
//   Notifications → set Production & Sandbox URLs to
//   https://fueltrack.me/.netlify/functions/ios-store-notification
//
// Required Netlify env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   APPLE_ROOT_CA_G3_B64
//   APPLE_INC_ROOT_CERT_B64
//   APPLE_BUNDLE_ID

import { createClient } from "@supabase/supabase-js";
import {
  SignedDataVerifier,
  Environment,
  NotificationTypeV2,
} from "@apple/app-store-server-library";
import { withCors } from "./_cors.js";
import { getAppleRootCertificates } from "./_appleCerts.js";

// Maps Apple notification types to an is_paid side effect.
//   true  → set is_paid = true
//   false → set is_paid = false
//   null  → ignore (nothing to do server-side)
const PAID_EFFECT = {
  [NotificationTypeV2.SUBSCRIBED]: true,
  [NotificationTypeV2.DID_RENEW]: true,
  [NotificationTypeV2.OFFER_REDEEMED]: true,
  [NotificationTypeV2.RENEWAL_EXTENDED]: true,
  [NotificationTypeV2.REFUND_REVERSED]: true,

  [NotificationTypeV2.EXPIRED]: false,
  [NotificationTypeV2.GRACE_PERIOD_EXPIRED]: false,
  [NotificationTypeV2.REFUND]: false,
  [NotificationTypeV2.REVOKE]: false,

  // Informational — DID_FAIL_TO_RENEW with subtype GRACE_PERIOD means
  // the user is in the grace period and should keep Pro until grace
  // expires. Without GRACE_PERIOD subtype it means billing retry is
  // in progress but subscription hasn't lapsed yet. Keep is_paid as-is
  // either way. (GRACE_PERIOD_EXPIRED above handles the lapse.)
  [NotificationTypeV2.DID_FAIL_TO_RENEW]: null,
  [NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS]: null,
  [NotificationTypeV2.DID_CHANGE_RENEWAL_PREF]: null,
  [NotificationTypeV2.PRICE_INCREASE]: null,
  [NotificationTypeV2.REFUND_DECLINED]: null,
  [NotificationTypeV2.CONSUMPTION_REQUEST]: null,
  [NotificationTypeV2.TEST]: null,
  [NotificationTypeV2.RENEWAL_EXTENSION]: null,
  [NotificationTypeV2.EXTERNAL_PURCHASE_TOKEN]: null,
  [NotificationTypeV2.ONE_TIME_CHARGE]: null,
  [NotificationTypeV2.RESCIND_CONSENT]: null,
};

async function verifyNotification(signedPayload, bundleId, appleRoots) {
  // Try PRODUCTION first, fall back to SANDBOX (Apple sends from both,
  // and we accept both — whichever the subscription was created in).
  for (const env of [Environment.PRODUCTION, Environment.SANDBOX]) {
    try {
      const verifier = new SignedDataVerifier(appleRoots, true, env, bundleId);
      const decoded = await verifier.verifyAndDecodeNotification(signedPayload);
      return { decoded, environment: env };
    } catch {
      // fall through to next environment
    }
  }
  throw new Error("Notification signature verification failed in both environments");
}

async function decodeTransaction(signedTransactionInfo, bundleId, appleRoots, environment) {
  if (!signedTransactionInfo) return null;
  const verifier = new SignedDataVerifier(appleRoots, true, environment, bundleId);
  return verifier.verifyAndDecodeTransaction(signedTransactionInfo);
}

async function notificationHandler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const bundleId = process.env.APPLE_BUNDLE_ID || "me.fueltrack.app";
  const appleRoots = getAppleRootCertificates();
  if (appleRoots.length === 0) {
    console.error("ios-store-notification: Apple root certs not configured");
    // Return 200 — Apple will retry, but we can't recover without env
    // vars; log loudly and acknowledge to stop the retry storm.
    return { statusCode: 200, body: JSON.stringify({ ignored: "server_not_configured" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    console.error("ios-store-notification: invalid JSON body");
    return { statusCode: 200, body: JSON.stringify({ ignored: "invalid_json" }) };
  }
  const { signedPayload } = body;
  if (!signedPayload) {
    console.error("ios-store-notification: missing signedPayload");
    return { statusCode: 200, body: JSON.stringify({ ignored: "missing_signed_payload" }) };
  }

  let decoded, environment;
  try {
    const result = await verifyNotification(signedPayload, bundleId, appleRoots);
    decoded = result.decoded;
    environment = result.environment;
  } catch (err) {
    console.error("ios-store-notification: verification failed", err?.message || err);
    return { statusCode: 200, body: JSON.stringify({ ignored: "verification_failed" }) };
  }

  const notificationType = decoded?.notificationType;
  const effect = PAID_EFFECT[notificationType];
  if (effect === undefined) {
    console.warn("ios-store-notification: unknown notificationType", notificationType);
    return { statusCode: 200, body: JSON.stringify({ ignored: "unknown_type" }) };
  }
  if (effect === null) {
    // Informational event, no is_paid change.
    return { statusCode: 200, body: JSON.stringify({ type: notificationType, change: "none" }) };
  }

  // Extract the transaction to find which user this notification is for.
  const signedTransactionInfo = decoded?.data?.signedTransactionInfo;
  let tx;
  try {
    tx = await decodeTransaction(signedTransactionInfo, bundleId, appleRoots, environment);
  } catch (err) {
    console.error("ios-store-notification: transaction decode failed", err?.message || err);
    return { statusCode: 200, body: JSON.stringify({ ignored: "transaction_decode_failed" }) };
  }
  const originalTransactionId = tx?.originalTransactionId;
  if (!originalTransactionId) {
    console.error("ios-store-notification: no originalTransactionId in payload");
    return { statusCode: 200, body: JSON.stringify({ ignored: "no_original_transaction_id" }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Look up the user via the stable original transaction id. If the
  // row isn't there yet (Apple is racing the client's
  // ios-validate-receipt call), log and acknowledge — the client
  // already set is_paid when it validated the receipt.
  const { data: profile, error: selectErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("ios_original_transaction_id", originalTransactionId)
    .maybeSingle();
  if (selectErr) {
    console.error("ios-store-notification: profile lookup failed", selectErr);
    return { statusCode: 200, body: JSON.stringify({ ignored: "profile_lookup_failed" }) };
  }
  if (!profile) {
    console.warn(
      "ios-store-notification: no profile for originalTransactionId=",
      originalTransactionId
    );
    return { statusCode: 200, body: JSON.stringify({ ignored: "profile_not_found" }) };
  }

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ is_paid: effect })
    .eq("id", profile.id);
  if (updateErr) {
    console.error("ios-store-notification: profile update failed", updateErr);
    return { statusCode: 200, body: JSON.stringify({ ignored: "profile_update_failed" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: notificationType,
      userId: profile.id,
      is_paid: effect,
    }),
  };
}

export const handler = withCors(notificationHandler);
