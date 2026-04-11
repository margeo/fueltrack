// Shared usage tracking for all AI-powered features (AI Coach, Food Photo Analyzer, etc.).
// Source of truth is Supabase (table: ai_usage). The backend gates every AI call
// and atomically increments the counter via the `increment_ai_usage` RPC.
// The client uses the `get_my_ai_usage` RPC to fetch its own current usage for
// the lock-screen UI.
//
// A small localStorage cache is kept so the UI has something to show on the
// very first render before the Supabase fetch resolves.

import { supabase } from "../supabaseClient";

export const AI_LIMITS = {
  DAILY_FREE: 5,
  MONTHLY_FREE: 20,
  LIFETIME_FREE: 20,
  MONTHLY_PAID: 500
};

function cacheKey(uid) {
  return "ft_ai_usage_cache_" + (uid || "anon");
}

export function getCachedUsage(uid) {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return { dailyCount: 0, monthlyCount: 0, lifetimeCount: 0 };
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    return {
      dailyCount:    parsed.date  === today ? (parsed.dailyCount    || 0) : 0,
      monthlyCount:  parsed.month === month ? (parsed.monthlyCount  || 0) : 0,
      lifetimeCount: parsed.lifetimeCount || 0
    };
  } catch {
    return { dailyCount: 0, monthlyCount: 0, lifetimeCount: 0 };
  }
}

export function setCachedUsage(uid, usage) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    localStorage.setItem(cacheKey(uid), JSON.stringify({
      date: today,
      month,
      dailyCount: usage.dailyCount || 0,
      monthlyCount: usage.monthlyCount || 0,
      lifetimeCount: usage.lifetimeCount || 0
    }));
  } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ft-ai-usage-change", { detail: { uid, usage } }));
  }
}

/**
 * Fetch the current user's usage from Supabase. Updates the local cache
 * and dispatches the sync event.
 * Returns { dailyCount, monthlyCount, lifetimeCount } or null if unauthenticated.
 */
export async function fetchUsage(uid) {
  if (!uid) return null;
  try {
    const { data, error } = await supabase.rpc("get_my_ai_usage");
    if (error || !data) return null;
    const usage = {
      dailyCount:    data.dailyCount    || 0,
      monthlyCount:  data.monthlyCount  || 0,
      lifetimeCount: data.lifetimeCount || 0
    };
    setCachedUsage(uid, usage);
    return usage;
  } catch {
    return null;
  }
}

export function computeLimitState({ usage, isPaid, isDemo, needsAccount }) {
  const unlimited = !!isDemo;
  const { dailyCount = 0, monthlyCount = 0, lifetimeCount = 0 } = usage || {};
  const dailyLimitReached    = !unlimited && (isPaid ? dailyCount   >= AI_LIMITS.MONTHLY_PAID : dailyCount   >= AI_LIMITS.DAILY_FREE);
  const monthlyLimitReached  = !unlimited && (isPaid ? monthlyCount >= AI_LIMITS.MONTHLY_PAID : monthlyCount >= AI_LIMITS.MONTHLY_FREE);
  const lifetimeLimitReached = !unlimited && !isPaid && lifetimeCount >= AI_LIMITS.LIFETIME_FREE;
  const paidLimitReached     = isPaid && !unlimited && (dailyCount >= AI_LIMITS.MONTHLY_PAID || monthlyCount >= AI_LIMITS.MONTHLY_PAID);
  const limitReached = !!needsAccount || dailyLimitReached || monthlyLimitReached || lifetimeLimitReached;
  return { unlimited, limitReached, dailyLimitReached, monthlyLimitReached, lifetimeLimitReached, paidLimitReached };
}
