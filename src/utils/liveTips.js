// Rule-based live-state tips.
//
// Pure function — inputs come in, an array of localized strings comes
// out, no side effects, no hooks, no network. The same helper powers
// the Dashboard Macros section today and will power the Coach hero,
// AiLimitLock, Food-tab empty state and (later) push notifications
// without any AI round-trip.
//
// Rules are evaluated in priority order: macro imbalance > meal-timing
// / fasting > calorie status > streak achievement > exercise bonus >
// weekly trend > fallback. The first `max` tips that fire are returned;
// callers typically want max = 3 for the Dashboard and max = 1 for
// compact surfaces like the paywall.

const FASTING_MODE_KEYS = new Set(["fasting_16_8", "fasting_18_6", "omad"]);

export function buildLiveTips({
  t,
  formatNumber = (n) => String(Math.round(Number(n) || 0)),
  // current-day numbers
  remainingCalories = 0,
  totalCalories = 0,
  totalProtein = 0,
  totalCarbs = 0,
  totalFat = 0,
  exerciseValue = 0,
  // targets
  targetCalories = 0,
  proteinTarget = 0,
  carbsTarget = 0,
  fatTarget = 0,
  // context
  mode = "",
  isToday = true,
  hour = null, // override for tests; defaults to new Date().getHours()
  last7Days = [],
  streak = 0,
  max = 3,
} = {}) {
  if (typeof t !== "function") return [];

  const tips = [];
  const currentHour = typeof hour === "number" ? hour : new Date().getHours();

  const actualKcal =
    (totalProtein || 0) * 4 + (totalCarbs || 0) * 4 + (totalFat || 0) * 9;
  const targetMacroKcal =
    proteinTarget * 4 + carbsTarget * 4 + fatTarget * 9;

  // ---- 1. Macro imbalance vs target share ------------------------------
  if (actualKcal > 120 && targetMacroKcal > 0) {
    const actualCarbsPct = (totalCarbs * 4) / actualKcal;
    const actualFatPct = (totalFat * 9) / actualKcal;
    const actualProtPct = (totalProtein * 4) / actualKcal;
    const targetCarbsPct = (carbsTarget * 4) / targetMacroKcal;
    const targetFatPct = (fatTarget * 9) / targetMacroKcal;
    const targetProtPct = (proteinTarget * 4) / targetMacroKcal;
    if (actualCarbsPct > targetCarbsPct + 0.12) tips.push(t("tips.highCarbs"));
    if (actualFatPct > targetFatPct + 0.12) tips.push(t("tips.highFat"));
    if (
      actualProtPct < targetProtPct - 0.1 &&
      totalProtein < proteinTarget * 0.6
    ) {
      tips.push(t("tips.lowProtein"));
    }
  }

  // ---- 2. Meal-timing / fasting hints (only when viewing today) --------
  if (isToday) {
    if (FASTING_MODE_KEYS.has(mode) && totalCalories < 100 && currentHour >= 12 && currentHour <= 20) {
      tips.push(t("tips.fastingEatNow"));
    } else if (currentHour >= 12 && totalCalories < 50) {
      tips.push(t("tips.skipBreakfast"));
    } else if (currentHour >= 20 && targetCalories > 0 && totalCalories < targetCalories * 0.5) {
      tips.push(t("tips.eveningUnderfed"));
    }
  }

  // ---- 3. Calorie status -----------------------------------------------
  if (remainingCalories > 200) {
    tips.push(t("tips.eatMore", { kcal: formatNumber(remainingCalories) }));
  } else if (remainingCalories >= 50 && remainingCalories <= 200) {
    tips.push(t("tips.almostThere", { kcal: formatNumber(remainingCalories) }));
  } else if (remainingCalories < -150) {
    tips.push(t("tips.overBudget", { kcal: formatNumber(Math.abs(remainingCalories)) }));
  } else {
    tips.push(t("tips.onTarget"));
  }

  // ---- 4. Streak achievement -------------------------------------------
  if (streak >= 7) {
    tips.push(t("tips.streakWeek", { days: streak }));
  } else if (streak >= 3) {
    tips.push(t("tips.streakProud", { days: streak }));
  }

  // ---- 5. Exercise bonus -----------------------------------------------
  if ((exerciseValue || 0) >= 150) {
    tips.push(t("tips.exerciseBonus", { kcal: formatNumber(exerciseValue) }));
  }

  // ---- 6. Weekly protein-trend (looks at past 7 days) -------------------
  if (Array.isArray(last7Days) && last7Days.length >= 4 && proteinTarget > 0) {
    const loggedDays = last7Days.filter((d) => d && d.eaten > 0);
    const lowProteinDays = loggedDays.filter(
      (d) => (d.protein || 0) < proteinTarget * 0.7
    ).length;
    if (loggedDays.length >= 4 && lowProteinDays >= 4) {
      tips.push(t("tips.weekLowProtein"));
    }
  }

  // ---- Fallback --------------------------------------------------------
  if (tips.length === 0) {
    tips.push(t("tips.onTrack"));
  }

  // Dedup (a rule block occasionally overlaps with the fallback) and cap.
  const seen = new Set();
  const unique = [];
  for (const tip of tips) {
    if (!tip || seen.has(tip)) continue;
    seen.add(tip);
    unique.push(tip);
    if (unique.length >= max) break;
  }
  return unique;
}
