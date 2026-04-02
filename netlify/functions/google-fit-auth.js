export async function handler() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = "https://fueltrack-marios.netlify.app/.netlify/functions/google-fit-callback";

  const scope = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.location.read"
  ].join(" ");

  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  return {
    statusCode: 302,
    headers: { Location: url }
  };
}