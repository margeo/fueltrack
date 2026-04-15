import nodemailer from "nodemailer";
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

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"FuelTrack" <${process.env.SMTP_USER}>`,
      to: "info@fueltrack.me",
      subject: `Νέος χρήστης: ${name || "Unknown"}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:500px;margin:0 auto">
          <div style="background:#111827;padding:24px;border-radius:12px 12px 0 0;text-align:center">
            <img src="https://fueltrack.me/icon-192.png" alt="FuelTrack" width="64" height="64" style="border-radius:14px;display:block;margin:0 auto 10px" />
            <h2 style="color:#ffffff;margin:0;font-size:22px;font-weight:800">FuelTrack</h2>
            <div style="color:#9ca3af;font-size:13px;margin-top:4px;font-weight:500">Plan → Track → Achieve!</div>
          </div>
          <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none">
            <div style="color:#111827;font-weight:700;font-size:15px;margin-bottom:16px">📬 New signup</div>
            <table style="width:100%;font-size:14px;border-collapse:collapse">
              <tr>
                <td style="padding:8px 0;font-weight:700;color:#6b7280;width:110px">Name:</td>
                <td style="padding:8px 0;color:#111827">${name || "—"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-weight:700;color:#6b7280">Email:</td>
                <td style="padding:8px 0;color:#111827"><a href="mailto:${email}" style="color:#111827;text-decoration:none">${email}</a></td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-weight:700;color:#6b7280">Date:</td>
                <td style="padding:8px 0;color:#111827">${new Date().toLocaleString("en-GB", { timeZone: "Europe/Athens" })}</td>
              </tr>
            </table>
          </div>
          <div style="background:#f9fafb;padding:14px;border-radius:0 0 12px 12px;text-align:center;border:1px solid #e5e7eb;border-top:none">
            <span style="color:#9ca3af;font-size:12px">FuelTrack — Diet &amp; Fitness</span>
          </div>
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Email notification error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to send notification" }) };
  }
});
