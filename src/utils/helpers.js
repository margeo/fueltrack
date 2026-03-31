export function getTodayKey() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDate(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("el-GR", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString("el-GR");
}

export function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export function normalizeDayLog(log) {
  if (!log) {
    return { entries: [], exercises: [] };
  }

  return {
    entries: Array.isArray(log.entries) ? log.entries : [],
    exercises: Array.isArray(log.exercises) ? log.exercises : []
  };
}

export function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function transliterateGreekToLatin(value) {
  const map = {
    α: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "i",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "x",
    ψ: "ps",
    ω: "o"
  };

  return stripDiacritics(String(value || "").toLowerCase())
    .split("")
    .map((char) => map[char] || char)
    .join("");
}

export function normalizeSearchText(value) {
  return stripDiacritics(String(value || "").toLowerCase())
    .replace(/[\/_,;:+()[\]{}|'"`~.!?@#$%^&*=<>-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFoodAliases(food) {
  return Array.isArray(food?.aliases)
    ? food.aliases.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export function getFoodSearchTexts(food) {
  const name = String(food?.name || "");
  const brand = String(food?.brand || "");
  const aliases = getFoodAliases(food);

  const rawValues = [name, brand, ...aliases].filter(Boolean);

  const normalized = rawValues.map((item) => normalizeSearchText(item)).filter(Boolean);
  const latinized = rawValues
    .map((item) => normalizeSearchText(transliterateGreekToLatin(item)))
    .filter(Boolean);

  return Array.from(new Set([...normalized, ...latinized]));
}

export function getFoodIdentityKey(food) {
  const normalizedName = normalizeSearchText(food?.name || "");
  const normalizedBrand = normalizeSearchText(food?.brand || "");
  return `${normalizedName}|${normalizedBrand}`;
}

export function normalizeFood(food) {
  return {
    id: food.id || `food-${Date.now()}`,
    source: food.source || "local",
    sourceLabel: food.sourceLabel || "",
    name: food.name || "Unknown food",
    brand: food.brand || "",
    aliases: getFoodAliases(food),
    caloriesPer100g: Number(food.caloriesPer100g || 0),
    proteinPer100g: Number(food.proteinPer100g || 0),
    carbsPer100g: Number(food.carbsPer100g || 0),
    fatPer100g: Number(food.fatPer100g || 0)
  };
}

export function createFoodEntry(food, gramsValue, meal) {
  const normalized = normalizeFood(food);
  const grams = Math.max(Number(gramsValue) || 100, 1);
  const factor = grams / 100;

  return {
    id: Date.now() + Math.random(),
    foodId: normalized.id,
    source: normalized.source,
    name: normalized.name,
    brand: normalized.brand,
    mealType: meal || "Πρωινό",
    grams,
    calories: Math.round(normalized.caloriesPer100g * factor),
    protein: round1(normalized.proteinPer100g * factor),
    carbs: round1(normalized.carbsPer100g * factor),
    fat: round1(normalized.fatPer100g * factor),
    baseCaloriesPer100g: normalized.caloriesPer100g,
    baseProteinPer100g: normalized.proteinPer100g,
    baseCarbsPer100g: normalized.carbsPer100g,
    baseFatPer100g: normalized.fatPer100g
  };
}

export function calculateBmr({ age, height, weight, gender }) {
  const a = Number(age);
  const h = Number(height);
  const w = Number(weight);

  if (!a || !h || !w) return 0;

  if (gender === "male") {
    return Math.round(10 * w + 6.25 * h - 5 * a + 5);
  }

  return Math.round(10 * w + 6.25 * h - 5 * a - 161);
}

export function calculateDailyDeficit({ goalType, targetWeightLoss, weeks }) {
  if (goalType !== "lose") return 0;

  const kg = Number(targetWeightLoss) || 0;
  const wks = Number(weeks) || 0;

  if (kg <= 0 || wks <= 0) return 300;

  const deficit = (kg * 7700) / (wks * 7);

  return Math.max(150, Math.min(Math.round(deficit), 1000));
}

export function calculateTargetCalories({ tdee, goalType, dailyDeficit }) {
  const safeTdee = Number(tdee) || 0;
  if (!safeTdee) return 0;

  switch (goalType) {
    case "maintain":
      return Math.round(safeTdee);

    case "lose":
      return Math.max(1200, Math.round(safeTdee - (Number(dailyDeficit) || 0)));

    case "gain":
      return Math.round(safeTdee + 300);

    default:
      return Math.round(safeTdee);
  }
}

export function calculateProteinTarget({ goalType, weight }) {
  const weightKg = Number(weight) || 0;
  if (!weightKg) return 0;

  switch (goalType) {
    case "lose":
      return Math.round(weightKg * 1.8);

    case "gain":
      return Math.round(weightKg * 2.0);

    case "maintain":
    default:
      return Math.round(weightKg * 1.4);
  }
}

export function entryBasePer100g(entry) {
  const grams = Math.max(Number(entry?.grams) || 100, 1);

  if (
    entry?.baseCaloriesPer100g !== undefined &&
    entry?.baseProteinPer100g !== undefined &&
    entry?.baseCarbsPer100g !== undefined &&
    entry?.baseFatPer100g !== undefined
  ) {
    return {
      caloriesPer100g: Number(entry.baseCaloriesPer100g || 0),
      proteinPer100g: Number(entry.baseProteinPer100g || 0),
      carbsPer100g: Number(entry.baseCarbsPer100g || 0),
      fatPer100g: Number(entry.baseFatPer100g || 0)
    };
  }

  return {
    caloriesPer100g: (Number(entry?.calories || 0) / grams) * 100,
    proteinPer100g: (Number(entry?.protein || 0) / grams) * 100,
    carbsPer100g: (Number(entry?.carbs || 0) / grams) * 100,
    fatPer100g: (Number(entry?.fat || 0) / grams) * 100
  };
}