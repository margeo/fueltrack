import { authedFetch } from "./authFetch";

// Opens Stripe Checkout in a new browser tab/window.
// On native (Capacitor), window.open opens the external browser,
// which is exactly what we want — Stripe checkout should NOT run
// inside the WebView.
//
// iOS Safari blocks window.open after an async call (popup blocker).
// Workaround: open a blank tab synchronously inside the click handler,
// then redirect it after the fetch completes.
export async function openCheckout() {
  const win = window.open("", "_blank");
  try {
    const res = await authedFetch("/.netlify/functions/stripe-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.url) {
      win.location.href = data.url;
    } else {
      win.close();
      throw new Error(data.error || "Could not start checkout");
    }
  } catch (err) {
    if (win && !win.closed) win.close();
    throw err;
  }
}

// Opens Stripe Customer Portal (manage subscription, cancel, etc.)
export async function openCustomerPortal() {
  const win = window.open("", "_blank");
  try {
    const res = await authedFetch("/.netlify/functions/stripe-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.url) {
      win.location.href = data.url;
    } else {
      win.close();
      throw new Error(data.error || "Could not open portal");
    }
  } catch (err) {
    if (win && !win.closed) win.close();
    throw err;
  }
}
