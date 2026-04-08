import nodemailer from "nodemailer";

export async function handler(event) {
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
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
          <div style="background:#1a1a2e;padding:24px;border-radius:12px 12px 0 0;text-align:center">
            <div style="font-size:32px;margin-bottom:8px">🔥</div>
            <h2 style="color:#4ade80;margin:0;font-size:20px">FuelTrack</h2>
            <div style="color:#94a3b8;font-size:12px;margin-top:4px;letter-spacing:1px">TRAIN · EAT · EVOLVE</div>
          </div>
          <div style="background:#111827;padding:24px;border:1px solid #374151;border-top:none">
            <div style="color:#4ade80;font-weight:bold;font-size:14px;margin-bottom:16px">📬 Νέος Χρήστης</div>
            <table style="width:100%;font-size:14px;border-collapse:collapse">
              <tr>
                <td style="padding:8px 0;font-weight:bold;color:#94a3b8">Όνομα:</td>
                <td style="padding:8px 0;color:#f1f5f9">${name || "—"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-weight:bold;color:#94a3b8">Email:</td>
                <td style="padding:8px 0;color:#f1f5f9">${email}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-weight:bold;color:#94a3b8">Ημερομηνία:</td>
                <td style="padding:8px 0;color:#f1f5f9">${new Date().toLocaleString("el-GR", { timeZone: "Europe/Athens" })}</td>
              </tr>
            </table>
          </div>
          <div style="background:#1a1a2e;padding:12px;border-radius:0 0 12px 12px;text-align:center;border:1px solid #374151;border-top:none">
            <span style="color:#64748b;font-size:11px">fueltrack.me</span>
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
