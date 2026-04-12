import { authedFetch } from "./authFetch";

// Opens Stripe Checkout in a new browser tab/window.
// On native (Capacitor), window.open opens the external browser,
// which is exactly what we want — Stripe checkout should NOT run
// inside the WebView.
export async function openCheckout() {
  const res = await authedFetch("/.netlify/functions/stripe-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (data.url) {
    window.open(data.url, "_blank");
  } else {
    throw new Error(data.error || "Could not start checkout");
  }
}

// Opens Stripe Customer Portal (manage subscription, cancel, etc.)
export async function openCustomerPortal() {
  const res = await authedFetch("/.netlify/functions/stripe-portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (data.url) {
    window.open(data.url, "_blank");
  } else {
    throw new Error(data.error || "Could not open portal");
  }
}
