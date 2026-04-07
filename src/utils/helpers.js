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

export function formatDisplayDate(dateStr, locale = "el-GR") {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString(locale, {
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

export function normalizeSearchText(value) {
  return stripDiacritics(String(value || "").toLowerCase())
    .replace(/[\/_,;:+()[\]{}|'"`~.!?@#$%^&*=<>-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toCompactSearchText(value) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function transliterateGreekToLatin(value) {
  let text = stripDiacritics(String(value || "").toLowerCase());

  const digraphs = [
    [/ου/g, "ou"],
    [/αι/g, "ai"],
    [/ει/g, "ei"],
    [/οι/g, "oi"],
    [/υι/g, "yi"],
    [/αυ/g, "av"],
    [/ευ/g, "ev"],
    [/ηυ/g, "iv"],
    [/γκ/g, "gk"],
    [/γγ/g, "ng"],
    [/μπ/g, "b"],
    [/ντ/g, "nt"],
    [/τσ/g, "ts"],
    [/τζ/g, "tz"]
  ];

  digraphs.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

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

  return text
    .split("")
    .map((char) => map[char] || char)
    .join("");
}

export function simplifyLatinGreeklish(value) {
  return normalizeSearchText(value)
    .replace(/ou/g, "u")
    .replace(/ei/g, "i")
    .replace(/oi/g, "i")
    .replace(/ai/g, "e")
    .replace(/yi/g, "i")
    .replace(/th/g, "8")
    .replace(/ch/g, "x")
    .replace(/gk/g, "g")
    .replace(/mp/g, "b")
    .replace(/nt/g, "d")
    .replace(/tz/g, "z")
    .replace(/ts/g, "s")
    .replace(/y/g, "i");
}

export function buildSearchVariants(value) {
  const original = normalizeSearchText(value);
  const compact = toCompactSearchText(value);
  const latin = normalizeSearchText(transliterateGreekToLatin(value));
  const latinCompact = toCompactSearchText(transliterateGreekToLatin(value));
  const simplifiedLatin = simplifyLatinGreeklish(transliterateGreekToLatin(value));
  const simplifiedOriginal = simplifyLatinGreeklish(value);

  return Array.from(
    new Set(
      [
        original,
        compact,
        latin,
        latinCompact,
        simplifiedLatin,
        simplifiedOriginal,
        toCompactSearchText(simplifiedLatin),
        toCompactSearchText(simplifiedOriginal)
      ].filter(Boolean)
    )
  );
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
  const expanded = rawValues.flatMap((item) => buildSearchVariants(item));

  return Array.from(new Set(expanded.filter(Boolean)));
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
    fatPer100g: Number(food.fatPer100g || 0),
    portions: Array.isArray(food.portions) ? food.portions : []
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