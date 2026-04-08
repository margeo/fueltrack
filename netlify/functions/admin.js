import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

async function verifyAdmin(event) {
  const token = event.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) return null;
  return user;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, body: "" };
  }

  try {
    const admin = await verifyAdmin(event);
    if (!admin) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const { action } = body;

    if (action === "list-users") {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email, is_paid, is_demo, created_at")
        .order("created_at", { ascending: false });
      if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, body: JSON.stringify({ users: data }) };
    }

    if (action === "update-user") {
      const { userId, updates } = body;
      if (!userId || !updates) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing userId or updates" }) };
      }
      // Only allow toggling is_paid and is_demo
      const allowed = {};
      if (typeof updates.is_paid === "boolean") allowed.is_paid = updates.is_paid;
      if (typeof updates.is_demo === "boolean") allowed.is_demo = updates.is_demo;
      if (Object.keys(allowed).length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "No valid updates" }) };
      }
      const { error } = await supabaseAdmin.from("profiles").update(allowed).eq("id", userId);
      if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === "delete-user") {
      const { userId } = body;
      if (!userId) return { statusCode: 400, body: JSON.stringify({ error: "Missing userId" }) };
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
