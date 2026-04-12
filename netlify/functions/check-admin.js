// Lightweight admin check endpoint. Returns 200 with { isAdmin }
// instead of 403, so the browser console stays clean.
//
// Used by AiCoach, FoodPhotoAnalyzer, ProfileTab to show admin UI.

import { createClient } from "@supabase/supabase-js";
import { withCors } from "./_cors.js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

async function checkAdminHandler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: false }),
    };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: false }),
      };
    }
    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase());
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin }),
    };
  } catch {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: false }),
    };
  }
}

export const handler = withCors(checkAdminHandler);
