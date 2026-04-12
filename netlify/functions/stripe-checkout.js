// Creates a Stripe Checkout Session for a FuelTrack Pro subscription.
//
// The caller must be authenticated (JWT in Authorization header).
// Returns { url } — the Stripe-hosted checkout page URL.
//
// Required env vars:
//   STRIPE_SECRET_KEY     — sk_live_... or sk_test_...
//   STRIPE_PRICE_ID       — price_... (the recurring price object)
//   SITE_URL              — https://fueltrack.me (for success/cancel redirects)
//   SUPABASE_URL          — for verifying the JWT
//   SUPABASE_SERVICE_ROLE_KEY

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { withCors } from "./_cors.js";

async function checkoutHandler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Verify JWT
  const auth = event.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: "Not authenticated" }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid token" }) };
  }

  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const sessionParams = {
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.SITE_URL}/?checkout=success`,
    cancel_url: `${process.env.SITE_URL}/?checkout=cancel`,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id },
  };

  // Re-use existing Stripe customer if we have one
  if (profile?.stripe_customer_id) {
    sessionParams.customer = profile.stripe_customer_id;
  } else {
    sessionParams.customer_email = user.email;
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create checkout session" }),
    };
  }
}

export const handler = withCors(checkoutHandler);
