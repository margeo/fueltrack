export async function handler(event) {
  const code = event.queryStringParameters?.code;
  const redirectUri = "https://fueltrack-marios.netlify.app/.netlify/functions/google-fit-callback";

  if (!code) {
    return {
      statusCode: 302,
      headers: { Location: "https://fueltrack-marios.netlify.app/?fit_error=no_code" }
    };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error);

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token || "";

    return {
      statusCode: 302,
      headers: {
        Location: `https://fueltrack-marios.netlify.app/?fit_token=${encodeURIComponent(accessToken)}&fit_refresh=${encodeURIComponent(refreshToken)}`
      }
    };
  } catch (err) {
    return {
      statusCode: 302,
      headers: { Location: `https://fueltrack-marios.netlify.app/?fit_error=${encodeURIComponent(err.message)}` }
    };
  }
}