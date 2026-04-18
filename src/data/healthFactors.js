// Health Profile — user-selectable health/condition factors that bias
// food and exercise recommendations in the AI Coach the same way
// foodCategories / fitnessLevel / etc. already do.
//
// Shape mirrors the food/fitness profile pattern: a list of keys +
// per-key rule bundles. The UI in ProfileTab renders the keys as
// chips, persists the selection in localStorage under
// ft_healthFactors, syncs to profiles.health_prefs on the server, and
// threads it through App.jsx → AiCoach as `healthFactors: string[]`.
// AiCoach turns the selection into explicit
// prioritize/avoid sentences that get appended to the meal-plan and
// training-plan system prompts.
//
// "none" is exclusive — selecting it clears the others and vice
// versa. When the array is empty or contains only "none", no
// biasing is applied (same as having no profile data at all).

export const HEALTH_FACTORS = [
  { key: "none",         icon: "🟢" },
  { key: "blood_sugar",  icon: "🩸" },
  { key: "heart",        icon: "❤️" },
  { key: "joints",       icon: "🦴" },
  { key: "digestion",    icon: "🥗" },
  { key: "hormonal",     icon: "⚖️" },
  { key: "recovery",     icon: "🤕" },
];

// Per-factor rule bundles. English strings so they go straight into
// the AI prompt; the UI surfaces them through i18n keys (see locales
// under healthRules.*) when/if we decide to show them to the user.
export const HEALTH_RULES = {
  blood_sugar: {
    foodPrioritize:     ["protein each meal", "fiber carbs", "vegetables", "balanced meals"],
    exercisePrioritize: ["walking after meals", "resistance training", "regular movement"],
    avoid:              ["sugary snacks", "carb-only meals", "binge eating"],
  },
  heart: {
    foodPrioritize:     ["olive oil", "fish", "vegetables", "oats / fiber", "lower sodium"],
    exercisePrioritize: ["walking", "cycling", "cardio base", "moderate weights"],
    avoid:              ["ultra-processed foods", "excess salt", "sedentary routine"],
  },
  joints: {
    foodPrioritize:     ["calorie control", "protein", "anti-inflammatory foods"],
    exercisePrioritize: ["swimming", "cycling", "walking", "machines", "mobility"],
    avoid:              ["jumping", "excessive running", "hard HIIT"],
  },
  digestion: {
    foodPrioritize:     ["simpler meals", "cooked foods", "hydration", "meal timing consistency"],
    exercisePrioritize: ["walking", "light to moderate training"],
    avoid:              ["huge meals", "greasy foods pre-workout", "overeating late night"],
  },
  hormonal: {
    foodPrioritize:     ["enough calories", "protein", "regular meals", "micronutrients"],
    exercisePrioritize: ["strength training", "steps", "recovery balance"],
    avoid:              ["crash diets", "overtraining", "poor sleep habits"],
  },
  recovery: {
    foodPrioritize:     ["high protein", "hydration", "nutrient-dense foods"],
    exercisePrioritize: ["rehab-friendly movement", "low-impact cardio", "progressive return"],
    avoid:              ["pain-pushing", "max intensity too soon"],
  },
};

// Returns only the factors that actually carry rules (i.e. excludes
// "none" and anything unknown). Used both by the AI prompt builder
// and by any UI surface that wants to show "Active rules".
export function getActiveHealthFactors(selected) {
  if (!Array.isArray(selected)) return [];
  return selected.filter((k) => k && k !== "none" && HEALTH_RULES[k]);
}

// Merges all prioritize/avoid arrays across the active factors into a
// single deduplicated bundle. Used to print a compact "do this / avoid
// this" block in the AI system prompt without repeating the same
// item twice (e.g. walking appears under multiple factors).
export function mergeHealthRules(selected) {
  const active = getActiveHealthFactors(selected);
  if (active.length === 0) return null;
  const food = new Set();
  const exercise = new Set();
  const avoid = new Set();
  for (const key of active) {
    const r = HEALTH_RULES[key];
    r.foodPrioritize.forEach((x) => food.add(x));
    r.exercisePrioritize.forEach((x) => exercise.add(x));
    r.avoid.forEach((x) => avoid.add(x));
  }
  return {
    factors: active,
    foodPrioritize: Array.from(food),
    exercisePrioritize: Array.from(exercise),
    avoid: Array.from(avoid),
  };
}
