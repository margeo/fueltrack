// New user signup notification — admin email sent to info@fueltrack.me.
//
// Previously used nodemailer + GreenGeeks SMTP (ams201.greengeeks.net),
// which was causing duplicate delivery of every admin notification.
// Migrated to the Resend HTTP API so:
//   1. Delivery is visible in the Resend dashboard (same as user emails).
//   2. `Idempotency-Key` eliminates any duplicate admin emails — Resend
//      dedupes requests with the same key inside a 24h window.
//
// Required Netlify env var:
//   RESEND_API_KEY — Resend API key with "Sending access" permission.

import crypto from "crypto";
import { withCors } from "./_cors.js";

export const handler = withCors(async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { name, email } = JSON.parse(event.body || "{}");

    if (!email) {
      return { statusCode: 400, body: "Missing email" };
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("new-user-notify: RESEND_API_KEY not configured");
      return { statusCode: 500, body: "Server not configured" };
    }

    // Idempotency key — Resend collapses any duplicate send with the same
    // key in the last 24h into a single delivery. Keyed on the signup
    // email so an accidental double-submit / retry yields ONE admin email.
    const idempotencyKey = `signup-${crypto
      .createHash("sha256")
      .update(email)
      .digest("hex")
      .slice(0, 32)}`;

    const dateStr = new Date().toLocaleString("en-GB", { timeZone: "Europe/Athens" });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: "FuelTrack <noreply@fueltrack.me>",
        to: ["info@fueltrack.me"],
        subject: `New signup: ${name || "Unknown"}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
            <div style="background:#1a1a2e;padding:24px;border-radius:12px 12px 0 0;text-align:center">
              <div style="font-size:32px;margin-bottom:8px">🔥</div>
              <h2 style="color:#4ade80;margin:0;font-size:20px">FuelTrack</h2>
              <div style="color:#94a3b8;font-size:12px;margin-top:4px;letter-spacing:1px">TRAIN · EAT · EVOLVE</div>
            </div>
            <div style="background:#111827;padding:24px;border:1px solid #374151;border-top:none">
              <div style="color:#4ade80;font-weight:bold;font-size:14px;margin-bottom:16px">📬 New Signup</div>
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;font-weight:bold;color:#94a3b8">Name:</td>
                  <td style="padding:8px 0;color:#f1f5f9">${name || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:bold;color:#94a3b8">Email:</td>
                  <td style="padding:8px 0;color:#f1f5f9">${email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:bold;color:#94a3b8">Date:</td>
                  <td style="padding:8px 0;color:#f1f5f9">${dateStr}</td>
                </tr>
              </table>
            </div>
            <div style="background:#1a1a2e;padding:12px;border-radius:0 0 12px 12px;text-align:center;border:1px solid #374151;border-top:none">
              <span style="color:#64748b;font-size:11px">fueltrack.me</span>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("new-user-notify: Resend API failed", response.status, errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to send notification" }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Email notification error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send notification" }),
    };
  }
});
