// Rule-based live-state tips, shared across Dashboard, Coach hero,
// AiLimitLock, Food/Exercise tab headers. Pure function — no hooks,
// no network, no AI.
//
// Each rule emits a tagged object { text, tags }. Callers can filter
// by tag (e.g. AiLimitLock only wants encouraging tips, not
// "over budget by 400 kcal" right after a paywall). The top-level
// `buildLiveTips` filters and caps; `ALL_TAGS` documents the taxonomy
// so surfaces can ask for the subset they want without hard-coding
// rule names.

const FASTING_MODE_KEYS = new Set(["fasting_16_8", "fasting_18_6", "omad"]);

// Available tags. Surfaces filter by one or more of these.
export const TIP_TAGS = {
  IMBALANCE: "imbalance",       // macro distribution off-target (high carbs / high fat / low protein)
  TIMING: "timing",             // time-of-day / fasting window hints
  HYDRATION: "hydration",       // generic water / hydration nudges
  CALORIE: "calorie",           // calorie status vs target (eat more, almost there, etc)
  STREAK: "streak",             // logging-streak achievements
  EXERCISE: "exercise",         // exercise-related (bonus earned, or no move in days)
  WEEKLY: "weekly",             // trends over last7Days
  GOAL: "goal",                 // goal-aware (lose / gain)
  WEIGHT: "weight",             // weigh-in reminders / plateau
  POSITIVE: "positive",         // purely encouraging — safe for paywall / limit screens
  NEUTRAL: "neutral",           // informational fallback
  FOOD_PROFILE: "foodProfile",  // driven by food-profile choices (allergies, cooking level, meals/day, simpleMode)
  EXERCISE_PROFILE: "exerciseProfile", // driven by exercise-profile choices (level, location, equipment, limitations, frequency)
  SUGGESTION_FOOD: "suggestionFood",   // concrete meal ideas tailored to the food profile
  SUGGESTION_EXERCISE: "suggestionExercise", // concrete workout ideas tailored to the exercise profile
};

// Keyed taxonomy so surfaces can request "only these tags" without
// naming rules.
export const TIP_SURFACES = {
  DASHBOARD: [
    TIP_TAGS.IMBALANCE, TIP_TAGS.TIMING, TIP_TAGS.HYDRATION, TIP_TAGS.CALORIE,
    TIP_TAGS.STREAK, TIP_TAGS.EXERCISE, TIP_TAGS.WEEKLY, TIP_TAGS.GOAL,
    TIP_TAGS.WEIGHT, TIP_TAGS.POSITIVE, TIP_TAGS.NEUTRAL,
  ],
  COACH: [
    TIP_TAGS.IMBALANCE, TIP_TAGS.CALORIE, TIP_TAGS.WEEKLY, TIP_TAGS.GOAL,
    TIP_TAGS.WEIGHT, TIP_TAGS.POSITIVE,
  ],
  PAYWALL: [TIP_TAGS.POSITIVE, TIP_TAGS.STREAK],
  FOOD: [TIP_TAGS.TIMING, TIP_TAGS.HYDRATION, TIP_TAGS.CALORIE, TIP_TAGS.POSITIVE, TIP_TAGS.FOOD_PROFILE],
  EXERCISE: [TIP_TAGS.EXERCISE, TIP_TAGS.HYDRATION, TIP_TAGS.POSITIVE, TIP_TAGS.EXERCISE_PROFILE],
  FOOD_ADD: [TIP_TAGS.SUGGESTION_FOOD],
  EXERCISE_ADD: [TIP_TAGS.SUGGESTION_EXERCISE],
};

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
  // targets & context
  targetCalories = 0,
  proteinTarget = 0,
  carbsTarget = 0,
  fatTarget = 0,
  goalType = "",
  mode = "",
  isToday = true,
  hour = null,
  now = null,
  last7Days = [],
  streak = 0,
  weightLog = [],
  // food profile (from Profile tab → Food Profile section)
  foodCategories = [],
  allergies = [],
  cookingLevel = "",
  cookingTime = "",
  simpleMode = false,
  mealsPerDay = "",
  todayMealsLogged = 0,
  // exercise profile (from Profile tab → Exercise Profile section)
  fitnessLevel = "",
  workoutLocation = "",
  equipment = [],
  limitations = "",
  workoutFrequency = "",
  sessionDuration = "",
  todayExerciseMinutes = 0,
  // presentation
  surface = "DASHBOARD",
  max = 3,
  // Texts shown on other surfaces on the same screen. Tips whose text
  // matches any entry here are skipped, so the user never sees the
  // same nudge twice when they scroll the page (e.g. 'You can eat
  // ~2.687 kcal more' on the Dashboard and again on the Food tab).
  excludeTexts = [],
} = {}) {
  if (typeof t !== "function") return [];

  const currentHour = typeof hour === "number" ? hour : new Date().getHours();
  const nowDate = now instanceof Date ? now : new Date();
  const allowedTags = new Set(TIP_SURFACES[surface] || TIP_SURFACES.DASHBOARD);
  const emit = (text, tags) => ({ text, tags: Array.isArray(tags) ? tags : [tags] });
  const candidates = [];

  const actualKcal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
  const targetMacroKcal = proteinTarget * 4 + carbsTarget * 4 + fatTarget * 9;

  // 1. MACRO IMBALANCE (vs target share)
  if (actualKcal > 120 && targetMacroKcal > 0) {
    const aP = (totalProtein * 4) / actualKcal;
    const aC = (totalCarbs * 4) / actualKcal;
    const aF = (totalFat * 9) / actualKcal;
    const tP = (proteinTarget * 4) / targetMacroKcal;
    const tC = (carbsTarget * 4) / targetMacroKcal;
    const tF = (fatTarget * 9) / targetMacroKcal;
    if (aC > tC + 0.12) candidates.push(emit(t("tips.highCarbs"), TIP_TAGS.IMBALANCE));
    if (aF > tF + 0.12) candidates.push(emit(t("tips.highFat"), TIP_TAGS.IMBALANCE));
    if (aP < tP - 0.1 && totalProtein < proteinTarget * 0.6) {
      candidates.push(emit(t("tips.lowProtein"), TIP_TAGS.IMBALANCE));
    }
    // Positive: all three within ±5 % of target
    if (
      Math.abs(aP - tP) <= 0.05 &&
      Math.abs(aC - tC) <= 0.05 &&
      Math.abs(aF - tF) <= 0.05 &&
      actualKcal > targetMacroKcal * 0.4
    ) {
      candidates.push(emit(t("tips.allMacrosBalanced"), [TIP_TAGS.POSITIVE, TIP_TAGS.IMBALANCE]));
    }
    // Positive: protein > 120 % target
    if (proteinTarget > 0 && totalProtein >= proteinTarget * 1.2) {
      candidates.push(emit(t("tips.highProteinDay"), [TIP_TAGS.POSITIVE, TIP_TAGS.IMBALANCE]));
    }
  }

  // 2. MEAL TIMING / FASTING (today only)
  if (isToday) {
    if (FASTING_MODE_KEYS.has(mode) && totalCalories < 100 && currentHour >= 12 && currentHour <= 20) {
      candidates.push(emit(t("tips.fastingEatNow"), TIP_TAGS.TIMING));
    } else if (currentHour >= 12 && totalCalories < 50) {
      candidates.push(emit(t("tips.skipBreakfast"), TIP_TAGS.TIMING));
    } else if (currentHour >= 20 && targetCalories > 0 && totalCalories < targetCalories * 0.5) {
      candidates.push(emit(t("tips.eveningUnderfed"), TIP_TAGS.TIMING));
    }
  }

  // 3. HYDRATION (soft, rotating — no water log, but still a useful nudge)
  // Fires from late morning onward as a gentle reminder. Low priority —
  // only lands when the higher-priority rules leave room.
  if (isToday && currentHour >= 10 && currentHour <= 22) {
    candidates.push(emit(t("tips.hydration"), TIP_TAGS.HYDRATION));
  }

  // 4. CALORIE STATUS
  if (remainingCalories > 200) {
    candidates.push(emit(t("tips.eatMore", { kcal: formatNumber(remainingCalories) }), TIP_TAGS.CALORIE));
  } else if (remainingCalories >= 50 && remainingCalories <= 200) {
    candidates.push(emit(t("tips.almostThere", { kcal: formatNumber(remainingCalories) }), TIP_TAGS.CALORIE));
  } else if (remainingCalories < -150) {
    candidates.push(emit(t("tips.overBudget", { kcal: formatNumber(Math.abs(remainingCalories)) }), TIP_TAGS.CALORIE));
  } else {
    candidates.push(emit(t("tips.onTarget"), [TIP_TAGS.CALORIE, TIP_TAGS.POSITIVE]));
  }

  // 5. GOAL-AWARE (lose/gain)
  if (goalType === "lose" && remainingCalories < -100 && targetCalories > 0) {
    candidates.push(emit(t("tips.loseOverTarget"), TIP_TAGS.GOAL));
  } else if (goalType === "gain" && remainingCalories > 300 && targetCalories > 0) {
    candidates.push(emit(t("tips.gainUnderTarget"), TIP_TAGS.GOAL));
  }

  // 6. STREAK (always positive)
  if (streak >= 7) {
    candidates.push(emit(t("tips.streakWeek", { days: streak }), [TIP_TAGS.STREAK, TIP_TAGS.POSITIVE]));
  } else if (streak >= 3) {
    candidates.push(emit(t("tips.streakProud", { days: streak }), [TIP_TAGS.STREAK, TIP_TAGS.POSITIVE]));
  }

  // 7. EXERCISE
  if ((exerciseValue || 0) >= 150) {
    candidates.push(emit(t("tips.exerciseBonus", { kcal: formatNumber(exerciseValue) }), [TIP_TAGS.EXERCISE, TIP_TAGS.POSITIVE]));
  }
  // Activity over past week
  if (Array.isArray(last7Days) && last7Days.length >= 4) {
    const recent = last7Days.slice(0, 7);
    const activeDays = recent.filter((d) => d && (d.exercise || 0) >= 100).length;
    const movedDays = recent.filter((d) => d && (d.exercise || 0) > 0).length;
    if (movedDays === 0) {
      candidates.push(emit(t("tips.noExerciseWeek"), TIP_TAGS.EXERCISE));
    } else if (activeDays >= 4) {
      candidates.push(emit(t("tips.exerciseConsistent", { days: activeDays }), [TIP_TAGS.EXERCISE, TIP_TAGS.POSITIVE]));
    }
  }

  // 8. WEEKLY TRENDS
  if (Array.isArray(last7Days) && last7Days.length >= 4 && proteinTarget > 0) {
    const logged = last7Days.filter((d) => d && d.eaten > 0);
    const lowProteinDays = logged.filter((d) => (d.protein || 0) < proteinTarget * 0.7).length;
    if (logged.length >= 4 && lowProteinDays >= 4) {
      candidates.push(emit(t("tips.weekLowProtein"), TIP_TAGS.WEEKLY));
    }
  }
  // Weekend overshoot: Sat/Sun average eaten exceeds weekday average by 30 %+
  if (Array.isArray(last7Days) && last7Days.length >= 7 && targetCalories > 0) {
    const pairs = last7Days.slice(0, 7).map((d) => {
      if (!d || !d.date) return null;
      const dt = new Date(d.date);
      return { eaten: d.eaten || 0, wkend: dt.getDay() === 0 || dt.getDay() === 6 };
    }).filter(Boolean);
    const wk = pairs.filter((p) => !p.wkend);
    const we = pairs.filter((p) => p.wkend);
    if (wk.length >= 3 && we.length >= 1) {
      const avgWk = wk.reduce((s, p) => s + p.eaten, 0) / wk.length;
      const avgWe = we.reduce((s, p) => s + p.eaten, 0) / we.length;
      if (avgWk > 0 && avgWe > avgWk * 1.3) {
        candidates.push(emit(t("tips.weekendOvershoot"), TIP_TAGS.WEEKLY));
      }
    }
  }

  // 9. WEIGH-IN REMINDER
  if (Array.isArray(weightLog) && weightLog.length > 0) {
    const lastEntry = weightLog[weightLog.length - 1];
    const lastDate = lastEntry?.date ? new Date(lastEntry.date) : null;
    if (lastDate && !isNaN(lastDate.getTime())) {
      const daysSince = Math.floor((nowDate - lastDate) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        candidates.push(emit(t("tips.weighIn", { days: daysSince }), TIP_TAGS.WEIGHT));
      }
    }
  }

  // 10. FOOD PROFILE-AWARE (Food tab empty state / related)
  if (Array.isArray(allergies) && allergies.length > 0) {
    candidates.push(emit(t("tips.allergyReminder"), TIP_TAGS.FOOD_PROFILE));
  }
  if (simpleMode) {
    candidates.push(emit(t("tips.simpleModeHint"), TIP_TAGS.FOOD_PROFILE));
  }
  if (cookingLevel === "beginner" && todayMealsLogged === 0) {
    candidates.push(emit(t("tips.beginnerCook"), TIP_TAGS.FOOD_PROFILE));
  } else if (cookingTime === "quick") {
    candidates.push(emit(t("tips.quickCookingHint"), TIP_TAGS.FOOD_PROFILE));
  }
  if (mealsPerDay && Number(mealsPerDay) > 0 && todayMealsLogged < Number(mealsPerDay) && isToday) {
    const mealsLeft = Number(mealsPerDay) - todayMealsLogged;
    if (mealsLeft > 0) {
      candidates.push(emit(t("tips.mealsLeft", { count: mealsLeft }), TIP_TAGS.FOOD_PROFILE));
    }
  }

  // 11. EXERCISE PROFILE-AWARE (Exercise tab hero / related)
  if (limitations && String(limitations).trim().length > 0) {
    candidates.push(emit(t("tips.limitationAware"), TIP_TAGS.EXERCISE_PROFILE));
  }
  if (workoutLocation === "home" && (!Array.isArray(equipment) || equipment.length === 0 || equipment.includes("none"))) {
    candidates.push(emit(t("tips.homeNoEquipment"), TIP_TAGS.EXERCISE_PROFILE));
  }
  if (fitnessLevel === "beginner" && todayExerciseMinutes === 0 && isToday) {
    candidates.push(emit(t("tips.beginnerFitness"), TIP_TAGS.EXERCISE_PROFILE));
  }
  if (workoutFrequency && Number(workoutFrequency) > 0 && Array.isArray(last7Days)) {
    const activeDaysWeek = last7Days.slice(0, 7).filter((d) => d && (d.exercise || 0) >= 50).length;
    const target = Number(workoutFrequency);
    if (activeDaysWeek < target) {
      const left = target - activeDaysWeek;
      candidates.push(emit(t("tips.workoutsLeft", { done: activeDaysWeek, target }), TIP_TAGS.EXERCISE_PROFILE));
      void left;
    }
  }
  if (sessionDuration && Number(sessionDuration) > 0 && todayExerciseMinutes === 0 && isToday) {
    candidates.push(emit(t("tips.sessionDurationHint", { mins: sessionDuration }), TIP_TAGS.EXERCISE_PROFILE));
  }

  // 12. FOOD SUGGESTIONS (FOOD_ADD surface — drawn directly from
  // the user's Food Profile picks so the nudge always references
  // categories / items they've actually marked as preferred.)
  const PROTEIN_ITEMS = ["chicken", "beef", "pork", "fish", "turkey", "eggs", "legumes", "tofu"];
  const VEGGIE_ITEMS = ["salads", "cooked_veggies", "soups"];
  const CARB_ITEMS = ["rice", "pasta", "bread", "potatoes", "oats"];
  const DAIRY_ITEMS = ["yogurt", "cheese", "milk"];
  const COOKING_METHODS = ["grilled", "oven", "boiled", "fried", "raw"];
  const foodCats = Array.isArray(foodCategories) ? foodCategories : [];

  const localizeItem = (key) => {
    const localized = t(`foodPrefs.item.${key}`, { defaultValue: "" });
    return localized || key;
  };
  const formatPicks = (keys) => keys.slice(0, 2).map(localizeItem).join(", ");

  const userProteins = foodCats.filter((c) => PROTEIN_ITEMS.includes(c));
  const userVeggies = foodCats.filter((c) => VEGGIE_ITEMS.includes(c));
  const userCarbs = foodCats.filter((c) => CARB_ITEMS.includes(c));
  const userDairy = foodCats.filter((c) => DAIRY_ITEMS.includes(c));
  const userCooking = foodCats.filter((c) => COOKING_METHODS.includes(c));

  if (userProteins.length > 0) {
    candidates.push(emit(t("tips.suggestUserProteins", { items: formatPicks(userProteins) }), TIP_TAGS.SUGGESTION_FOOD));
  }
  if (userVeggies.length > 0) {
    candidates.push(emit(t("tips.suggestUserVeggies", { items: formatPicks(userVeggies) }), TIP_TAGS.SUGGESTION_FOOD));
  }
  if (userCarbs.length > 0) {
    candidates.push(emit(t("tips.suggestUserCarbs", { items: formatPicks(userCarbs) }), TIP_TAGS.SUGGESTION_FOOD));
  }
  if (userDairy.length > 0) {
    candidates.push(emit(t("tips.suggestUserDairy", { items: formatPicks(userDairy) }), TIP_TAGS.SUGGESTION_FOOD));
  }
  if (userCooking.length > 0) {
    candidates.push(emit(t("tips.suggestUserCooking", { method: formatPicks(userCooking) }), TIP_TAGS.SUGGESTION_FOOD));
  }
  if (cookingLevel === "beginner") {
    candidates.push(emit(t("tips.suggestBeginner"), TIP_TAGS.SUGGESTION_FOOD));
  }
  if (cookingTime === "quick") {
    candidates.push(emit(t("tips.suggestQuick"), TIP_TAGS.SUGGESTION_FOOD));
  }
  // Empty-profile fallback — points the user back to Profile to fill in preferences.
  if (foodCats.length === 0 && !simpleMode && !cookingLevel && !cookingTime) {
    candidates.push(emit(t("tips.suggestSetFoodPrefs"), TIP_TAGS.SUGGESTION_FOOD));
  }
  // Last-resort fallback so the surface is never empty.
  candidates.push(emit(t("tips.suggestBalanced"), TIP_TAGS.SUGGESTION_FOOD));

  // 13. EXERCISE SUGGESTIONS (for the EXERCISE_ADD surface — concrete workout ideas)
  const hasLimitations = limitations && String(limitations).trim().length > 0;
  const eqList = Array.isArray(equipment) ? equipment : [];
  const noEquip = eqList.length === 0 || (eqList.length === 1 && eqList.includes("none"));
  if (hasLimitations) {
    candidates.push(emit(t("tips.suggestSafeMove"), TIP_TAGS.SUGGESTION_EXERCISE));
  }
  if (workoutLocation === "home" && fitnessLevel === "beginner" && noEquip) {
    candidates.push(emit(t("tips.suggestHomeBeginner"), TIP_TAGS.SUGGESTION_EXERCISE));
  } else if (workoutLocation === "home" && noEquip) {
    candidates.push(emit(t("tips.suggestHomeNoKit"), TIP_TAGS.SUGGESTION_EXERCISE));
  } else if (workoutLocation === "home" && eqList.includes("dumbbells")) {
    candidates.push(emit(t("tips.suggestDumbbells"), TIP_TAGS.SUGGESTION_EXERCISE));
  }
  if (workoutLocation === "gym") {
    candidates.push(emit(t("tips.suggestGym"), TIP_TAGS.SUGGESTION_EXERCISE));
  }
  if (workoutLocation === "outdoor") {
    candidates.push(emit(t("tips.suggestOutdoor"), TIP_TAGS.SUGGESTION_EXERCISE));
  }
  // Fallback suggestion
  candidates.push(emit(t("tips.suggestAnyMove"), TIP_TAGS.SUGGESTION_EXERCISE));

  // FALLBACK
  if (candidates.length === 0) {
    candidates.push(emit(t("tips.onTrack"), [TIP_TAGS.NEUTRAL, TIP_TAGS.POSITIVE]));
  }

  // Filter by allowed tags, exclude already-shown texts, dedupe, cap.
  const blocked = new Set(Array.isArray(excludeTexts) ? excludeTexts : []);
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    if (!c || !c.text || seen.has(c.text) || blocked.has(c.text)) continue;
    if (!c.tags.some((tag) => allowedTags.has(tag))) continue;
    seen.add(c.text);
    out.push(c.text);
    if (out.length >= max) break;
  }
  // If the filter leaves us empty (rare, e.g. paywall with no positive
  // rules firing), surface the neutral fallback so the UI still has
  // something to show.
  if (out.length === 0) {
    out.push(t("tips.onTrack"));
  }
  return out;
}
