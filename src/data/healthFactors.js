// Health Profile — user-selectable health/condition factors that bias
// food and exercise recommendations in the AI Coach the same way
// foodCategories / fitnessLevel / etc. already do.
//
// Shape mirrors the food/fitness profile pattern: a list of keys +
// per-key rule bundles. The UI in ProfileTab renders the keys as
// chips, persists the selection in localStorage under
// ft_healthFactors, syncs to user_state.health_prefs on the server,
// and threads it through App.jsx → AiCoach as `healthFactors: string[]`.
//
// Rules are split into a `food` and an `exercise` bucket per factor
// so the AI Coach can inject the right bucket into the right prompt:
// meal-plan prompts only see food rules (prioritize + avoid), and
// training-plan prompts only see exercise rules — avoids the "don't
// jump" advice leaking into a meal plan just because the user has
// joint issues, and likewise avoids "eat less salt" noise in a
// training plan. Generic-chat uses both so the coach has the full
// picture when the user asks open-ended questions.
//
// "none" is exclusive — selecting it clears the others and vice
// versa. When the selection is empty or only "none", no biasing is
// applied (same as having no profile data at all).

export const HEALTH_FACTORS = [
  { key: "none",         icon: "🟢" },
  { key: "blood_sugar",  icon: "🩸" },
  { key: "heart",        icon: "❤️" },
  { key: "joints",       icon: "🦴" },
  { key: "digestion",    icon: "🥗" },
  { key: "hormonal",     icon: "⚖️" },
  { key: "recovery",     icon: "🤕" },
];

// Per-factor rule bundles, split into food vs exercise domains.
// English strings because they go straight into the AI system prompt.
export const HEALTH_RULES = {
  blood_sugar: {
    food: {
      prioritize: ["protein each meal", "fiber carbs", "vegetables", "balanced meals"],
      avoid:      ["sugary snacks", "carb-only meals", "binge eating"],
    },
    exercise: {
      prioritize: ["walking after meals", "resistance training", "regular movement"],
      avoid:      [],
    },
  },
  heart: {
    food: {
      prioritize: ["olive oil", "fish", "vegetables", "oats / fiber", "lower sodium"],
      avoid:      ["ultra-processed foods", "excess salt"],
    },
    exercise: {
      prioritize: ["walking", "cycling", "cardio base", "moderate weights"],
      avoid:      ["sedentary routine"],
    },
  },
  joints: {
    food: {
      // Indirect but real: weight control reduces joint load, protein
      // supports cartilage/ligaments, anti-inflammatory foods help.
      prioritize: ["calorie control", "protein", "anti-inflammatory foods"],
      avoid:      [],
    },
    exercise: {
      prioritize: ["swimming", "cycling", "walking", "machines", "mobility"],
      avoid:      ["jumping", "excessive running", "hard HIIT"],
    },
  },
  digestion: {
    food: {
      prioritize: ["simpler meals", "cooked foods", "hydration", "meal timing consistency"],
      avoid:      ["huge meals", "greasy foods pre-workout", "overeating late night"],
    },
    exercise: {
      prioritize: ["walking", "light to moderate training"],
      avoid:      [],
    },
  },
  hormonal: {
    food: {
      prioritize: ["enough calories", "protein", "regular meals", "micronutrients"],
      avoid:      ["crash diets"],
    },
    exercise: {
      prioritize: ["strength training", "steps", "recovery balance"],
      avoid:      ["overtraining", "poor sleep habits"],
    },
  },
  recovery: {
    food: {
      prioritize: ["high protein", "hydration", "nutrient-dense foods"],
      avoid:      [],
    },
    exercise: {
      prioritize: ["rehab-friendly movement", "low-impact cardio", "progressive return"],
      avoid:      ["pain-pushing", "max intensity too soon"],
    },
  },
};

// Returns only the factors that actually carry rules (i.e. excludes
// "none" and anything unknown).
export function getActiveHealthFactors(selected) {
  if (!Array.isArray(selected)) return [];
  return selected.filter((k) => k && k !== "none" && HEALTH_RULES[k]);
}

// Builds a domain-specific merger. Returns null when there are no
// active factors (or when all active factors have empty buckets for
// the requested domain) so callers can skip the whole injection.
function buildDomainMerger(domain) {
  return function merger(selected) {
    const active = getActiveHealthFactors(selected);
    if (active.length === 0) return null;
    const prioritize = new Set();
    const avoid = new Set();
    for (const key of active) {
      const bucket = HEALTH_RULES[key]?.[domain];
      if (!bucket) continue;
      bucket.prioritize.forEach((x) => prioritize.add(x));
      bucket.avoid.forEach((x) => avoid.add(x));
    }
    if (prioritize.size === 0 && avoid.size === 0) return null;
    return {
      factors: active,
      prioritize: Array.from(prioritize),
      avoid: Array.from(avoid),
    };
  };
}

// Only food.prioritize + food.avoid across the active factors.
// Used by the meal-plan system prompt and the food section of the
// generic-chat context.
export const mergeHealthFoodRules = buildDomainMerger("food");

// Only exercise.prioritize + exercise.avoid across the active
// factors. Used by the training-plan system prompt and the exercise
// section of the generic-chat context.
export const mergeHealthExerciseRules = buildDomainMerger("exercise");
