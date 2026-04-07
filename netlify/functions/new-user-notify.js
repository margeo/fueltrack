import nodemailer from "nodemailer";

export async function handler(event) {
  // Only accept POST from Supabase webhook
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Verify webhook secret
  const secret = event.headers["x-webhook-secret"] || event.headers["X-Webhook-Secret"];
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const { record } = payload;

    if (!record) {
      return { statusCode: 400, body: "No record in payload" };
    }

    const email = record.email || "Unknown";
    const name = record.raw_user_meta_data?.full_name || "No name";
    const createdAt = record.created_at || new Date().toISOString();

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
      subject: `🆕 Νέος χρήστης: ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
          <div style="background:#863bff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
            <h2 style="color:white;margin:0">⚡ FuelTrack — Νέος Χρήστης</h2>
          </div>
          <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <table style="width:100%;font-size:14px;border-collapse:collapse">
              <tr>
                <td style="padding:8px 0;font-weight:bold;color:#374151">Όνομα:</td>
                <td style="padding:8px 0;color:#111">${name}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-weight:bold;color:#374151">Email:</td>
                <td style="padding:8px 0;color:#111">${email}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-weight:bold;color:#374151">Ημερομηνία:</td>
                <td style="padding:8px 0;color:#111">${new Date(createdAt).toLocaleString("el-GR", { timeZone: "Europe/Athens" })}</td>
              </tr>
            </table>
          </div>
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Email notification error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to send notification" }) };
  }
}
