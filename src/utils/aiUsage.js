// Shared usage tracking for all AI-powered features (AI Coach, Food Photo Analyzer, etc.)
// All features read/write to the same localStorage key so counts are combined.

export const AI_LIMITS = {
  DAILY_FREE: 5,
  MONTHLY_FREE: 20,
  LIFETIME_FREE: 20,
  MONTHLY_PAID: 500
};

function storageKey(uid) {
  return "ft_ai_usage_" + (uid || "anon");
}

export function getUsage(uid) {
  const stored = JSON.parse(localStorage.getItem(storageKey(uid)) || "{}");
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  return {
    dailyCount: stored.date === today ? (stored.count || 0) : 0,
    monthlyCount: stored.month === month ? (stored.monthCount || 0) : 0,
    lifetimeCount: stored.lifetime || 0
  };
}

export function incrementUsage(uid) {
  const stored = JSON.parse(localStorage.getItem(storageKey(uid)) || "{}");
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const newDaily = (stored.date === today ? (stored.count || 0) : 0) + 1;
  const newMonthly = (stored.month === month ? (stored.monthCount || 0) : 0) + 1;
  const newLifetime = (stored.lifetime || 0) + 1;
  localStorage.setItem(storageKey(uid), JSON.stringify({
    date: today,
    count: newDaily,
    month,
    monthCount: newMonthly,
    lifetime: newLifetime
  }));
  const newUsage = { dailyCount: newDaily, monthlyCount: newMonthly, lifetimeCount: newLifetime };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ft-ai-usage-change", { detail: { uid, usage: newUsage } }));
  }
  return newUsage;
}

export function computeLimitState({ usage, isPaid, isDemo, needsAccount }) {
  const unlimited = !!isDemo;
  const { dailyCount, monthlyCount, lifetimeCount } = usage;
  const dailyLimitReached = !unlimited && (isPaid ? dailyCount >= AI_LIMITS.MONTHLY_PAID : dailyCount >= AI_LIMITS.DAILY_FREE);
  const monthlyLimitReached = !unlimited && (isPaid ? monthlyCount >= AI_LIMITS.MONTHLY_PAID : monthlyCount >= AI_LIMITS.MONTHLY_FREE);
  const lifetimeLimitReached = !unlimited && !isPaid && lifetimeCount >= AI_LIMITS.LIFETIME_FREE;
  const paidLimitReached = isPaid && !unlimited && (dailyCount >= AI_LIMITS.MONTHLY_PAID || monthlyCount >= AI_LIMITS.MONTHLY_PAID);
  const limitReached = !!needsAccount || dailyLimitReached || monthlyLimitReached || lifetimeLimitReached;
  return { unlimited, limitReached, dailyLimitReached, monthlyLimitReached, lifetimeLimitReached, paidLimitReached };
}
