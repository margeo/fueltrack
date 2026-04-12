// Stripe webhook handler.
//
// Receives events from Stripe (subscription created/updated/deleted,
// checkout completed) and updates the user's `is_paid` and
// `stripe_customer_id` columns in Supabase.
//
// Required env vars:
//   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
//   STRIPE_WEBHOOK_SECRET    — whsec_... (from Stripe Dashboard → Webhooks)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Stripe webhook events to configure:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Update is_paid based on whether the user has any active subscription
async function syncPaidStatus(supabase, stripeCustomerId) {
  // Find the Supabase user linked to this Stripe customer
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId);

  if (!profiles || profiles.length === 0) return;

  // Check if there's any active subscription for this customer
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
    limit: 1,
  });
  const isPaid = subscriptions.data.length > 0;

  for (const profile of profiles) {
    await supabase
      .from("profiles")
      .update({ is_paid: isPaid })
      .eq("id", profile.id);
  }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Verify Stripe signature
  const sig = event.headers["stripe-signature"];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const supabase = getSupabase();

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object;
      const userId = session.client_reference_id || session.metadata?.supabase_user_id;
      const customerId = session.customer;

      if (userId && customerId) {
        // Link the Stripe customer to the Supabase user
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId, is_paid: true })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = stripeEvent.data.object;
      const customerId = subscription.customer;
      if (customerId) {
        await syncPaidStatus(supabase, customerId);
      }
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
