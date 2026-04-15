// Permanently deletes the authenticated user's account.
//
// Required for Apple App Store Guideline 5.1.1(v): apps that support
// account creation must also support in-app account deletion. The flow
// is triggered from the Profile tab after the user types "DELETE" to
// confirm.
//
// Cascade: profiles, user_state and ai_usage all have ON DELETE CASCADE
// on user_id REFERENCES auth.users(id), so deleting from auth.users
// removes every related row automatically. No manual per-table cleanup.
//
// Required Netlify env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (needed for supabase.auth.admin.deleteUser)

import { createClient } from "@supabase/supabase-js";
import { withCors } from "./_cors.js";

async function deleteAccountHandler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing token" }),
    };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the JWT → resolves the user id we will delete. The client
    // can only ever delete its own account because we derive the id
    // from the token rather than a request param.
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid token" }),
      };
    }

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error("delete-account: admin.deleteUser failed", deleteErr);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to delete account" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleted: true }),
    };
  } catch (error) {
    console.error("delete-account error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to delete account" }),
    };
  }
}

export const handler = withCors(deleteAccountHandler);
