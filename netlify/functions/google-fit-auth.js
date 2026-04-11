import { withCors } from "./_cors.js";

export const handler = withCors(async function handler() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = "https://fueltrack.me/.netlify/functions/google-fit-callback";

  const scope = [
    "https://www.googleapis.com/auth/fitness.activity.read"
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
});