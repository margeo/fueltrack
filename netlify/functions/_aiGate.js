// Shared helper for Netlify AI endpoints (ai-coach, food-photo, etc.).
// - verifies the caller's JWT
// - reads their paid/demo flags from profiles
// - reads current ai_usage and checks the daily/monthly/lifetime limits
// - after a successful AI call, atomically increments usage

import { createClient } from "@supabase/supabase-js";

export const AI_LIMITS = {
  DAILY_FREE: 5,
  MONTHLY_FREE: 20,
  LIFETIME_FREE: 20,
  MONTHLY_PAID: 500
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

let supabaseAdmin = null;
function getAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseAdmin;
}

function computeLimitState({ usage, isPaid, isDemo, isAdmin }) {
  const unlimited = !!isDemo || !!isAdmin;
  const { dailyCount = 0, monthlyCount = 0, lifetimeCount = 0 } = usage || {};
  const dailyLimitReached    = !unlimited && (isPaid ? dailyCount   >= AI_LIMITS.MONTHLY_PAID : dailyCount   >= AI_LIMITS.DAILY_FREE);
  const monthlyLimitReached  = !unlimited && (isPaid ? monthlyCount >= AI_LIMITS.MONTHLY_PAID : monthlyCount >= AI_LIMITS.MONTHLY_FREE);
  const lifetimeLimitReached = !unlimited && !isPaid && lifetimeCount >= AI_LIMITS.LIFETIME_FREE;
  const paidLimitReached     = isPaid && !unlimited && (dailyCount >= AI_LIMITS.MONTHLY_PAID || monthlyCount >= AI_LIMITS.MONTHLY_PAID);
  const limitReached = dailyLimitReached || monthlyLimitReached || lifetimeLimitReached;
  return { unlimited, limitReached, dailyLimitReached, monthlyLimitReached, lifetimeLimitReached, paidLimitReached };
}

async function readUsage(admin, userId) {
  const { data, error } = await admin
    .from("ai_usage")
    .select("daily_count, daily_date, monthly_count, monthly_month, lifetime_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { dailyCount: 0, monthlyCount: 0, lifetimeCount: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  return {
    dailyCount:    data.daily_date    === today ? (data.daily_count   || 0) : 0,
    monthlyCount:  data.monthly_month === month ? (data.monthly_count || 0) : 0,
    lifetimeCount: data.lifetime_count || 0
  };
}

/**
 * Check if the caller is allowed to make an AI request.
 * Returns one of:
 *   { ok: false, statusCode, error, body }  — return this directly
 *   { ok: true,  userId, isPaid, isDemo, usage, admin }
 */
export async function checkAiGate(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, statusCode: 401, body: JSON.stringify({ error: "Missing authorization token" }) };
  }

  const admin = getAdmin();

  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return { ok: false, statusCode: 401, body: JSON.stringify({ error: "Invalid session" }) };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("is_paid, is_demo")
    .eq("id", user.id)
    .maybeSingle();
  const isPaid = profile?.is_paid === true;
  const isDemo = profile?.is_demo === true;
  const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase());

  const usage = await readUsage(admin, user.id);
  const limitState = computeLimitState({ usage, isPaid, isDemo, isAdmin });

  if (limitState.limitReached) {
    return {
      ok: false,
      statusCode: 429,
      body: JSON.stringify({
        error: "AI usage limit reached",
        limitReached: true,
        usage,
        limitState
      })
    };
  }

  return { ok: true, userId: user.id, isPaid, isDemo, isAdmin, usage, admin };
}

/**
 * Atomically increment the user's usage after a successful AI call.
 * Returns the new usage object (or null if the RPC failed).
 */
export async function incrementAiUsage(admin, userId) {
  try {
    const { data, error } = await admin.rpc("increment_ai_usage", { p_user_id: userId });
    if (error) {
      console.error("increment_ai_usage failed:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("increment_ai_usage threw:", err);
    return null;
  }
}
