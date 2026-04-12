// Creates a Stripe Customer Portal session so paying users
// can manage their subscription (cancel, update payment method).
//
// The caller must be authenticated and have a stripe_customer_id.
// Returns { url } — the Stripe-hosted portal URL.
//
// Required env vars:
//   STRIPE_SECRET_KEY
//   SITE_URL
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { withCors } from "./_cors.js";

async function portalHandler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No subscription found" }),
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.SITE_URL}/`,
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe portal error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not open customer portal" }),
    };
  }
}

export const handler = withCors(portalHandler);
