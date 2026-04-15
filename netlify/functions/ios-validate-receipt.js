// iOS StoreKit 2 receipt validator.
//
// Called by the client right after a successful native purchase (see
// src/utils/subscription.js). The client sends the JWS representation
// of the transaction; this function verifies it against Apple's root
// CAs using Apple's official app-store-server-library, then flips
// profiles.is_paid / subscription_source / ios_original_transaction_id.
//
// Why server-side verification: the JWS is signed by Apple, so a
// malicious iOS user cannot forge "I bought Pro" claims — the library
// rejects any JWS whose signature doesn't chain up to an Apple root.
//
// Required Netlify env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   — bypass RLS when updating profiles
//   APPLE_ROOT_CA_G3_B64        — base64 of AppleRootCA-G3.cer
//   APPLE_INC_ROOT_CERT_B64     — base64 of AppleIncRootCertificate.cer
//   APPLE_BUNDLE_ID             — "me.fueltrack.app"

import { createClient } from "@supabase/supabase-js";
import { SignedDataVerifier, Environment } from "@apple/app-store-server-library";
import { withCors } from "./_cors.js";
import { getAppleRootCertificates } from "./_appleCerts.js";

const PRO_MONTHLY_PRODUCT_ID = "me.fueltrack.app.pro_monthly";

// Verify JWS trying PRODUCTION first and falling back to SANDBOX.
// Apple reviewers use SANDBOX, real users PRODUCTION — this follows
// Apple's recommended pattern of attempting production verification
// first to avoid a sandbox-path leak in production builds.
async function verifyTransaction(jws, bundleId, appleRoots) {
  const envs = [Environment.PRODUCTION, Environment.SANDBOX];
  let lastErr;
  for (const env of envs) {
    try {
      const verifier = new SignedDataVerifier(appleRoots, true, env, bundleId);
      const payload = await verifier.verifyAndDecodeTransaction(jws);
      return { payload, environment: env };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function validateReceiptHandler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: "Missing token" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }
  const { jws } = body;
  if (!jws || typeof jws !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing jws" }) };
  }

  const bundleId = process.env.APPLE_BUNDLE_ID || "me.fueltrack.app";
  const appleRoots = getAppleRootCertificates();
  if (appleRoots.length === 0) {
    console.error("ios-validate-receipt: Apple root certs not configured");
    return { statusCode: 500, body: JSON.stringify({ error: "Server not configured" }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Resolve the Supabase user id from the JWT so we can both enforce
  // that a user can only activate their own subscription AND write the
  // update with a trusted identifier (never a request field).
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid token" }) };
  }

  let verified;
  try {
    verified = await verifyTransaction(jws, bundleId, appleRoots);
  } catch (err) {
    console.error("ios-validate-receipt: JWS verification failed", err?.message || err);
    return { statusCode: 400, body: JSON.stringify({ error: "Receipt verification failed" }) };
  }
  const { payload } = verified;

  // Defense in depth — the JWS signature alone proves Apple issued the
  // payload; the following checks prove it matches this app and this
  // user specifically.
  if (payload.bundleId !== bundleId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Bundle id mismatch" }) };
  }
  if (payload.productId !== PRO_MONTHLY_PRODUCT_ID) {
    return { statusCode: 400, body: JSON.stringify({ error: "Unknown product id" }) };
  }
  if (payload.appAccountToken && payload.appAccountToken !== user.id) {
    // The client passes the Supabase user id as appAccountToken when
    // starting the purchase (src/utils/iosIAP.js → purchaseProMonthly),
    // so if it's present it must match. Missing is allowed for
    // subscriptions restored on a new device where the token may not
    // have flowed through.
    return { statusCode: 403, body: JSON.stringify({ error: "Transaction belongs to another account" }) };
  }
  if (payload.expiresDate && payload.expiresDate < Date.now()) {
    return { statusCode: 400, body: JSON.stringify({ error: "Subscription already expired" }) };
  }

  const originalTransactionId = payload.originalTransactionId || null;
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      is_paid: true,
      subscription_source: "ios",
      ios_original_transaction_id: originalTransactionId,
    })
    .eq("id", user.id);
  if (updateErr) {
    console.error("ios-validate-receipt: profile update failed", updateErr);
    return { statusCode: 500, body: JSON.stringify({ error: "Profile update failed" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paid: true,
      productId: payload.productId,
      originalTransactionId,
      expiresDate: payload.expiresDate ?? null,
      environment: verified.environment,
    }),
  };
}

export const handler = withCors(validateReceiptHandler);
