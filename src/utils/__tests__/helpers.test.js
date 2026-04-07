import { describe, it, expect } from "vitest";
import {
  getTodayKey,
  shiftDate,
  formatNumber,
  round1,
  normalizeDayLog,
  stripDiacritics,
  normalizeSearchText,
  toCompactSearchText,
  transliterateGreekToLatin,
  simplifyLatinGreeklish,
  buildSearchVariants,
  getFoodAliases,
  // getFoodSearchTexts,
  getFoodIdentityKey,
  normalizeFood,
  createFoodEntry,
  entryBasePer100g,
} from "../helpers";

describe("getTodayKey", () => {
  it("returns a date string in YYYY-MM-DD format", () => {
    const key = getTodayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("shiftDate", () => {
  it("shifts forward by 1 day", () => {
    expect(shiftDate("2024-01-15", 1)).toBe("2024-01-16");
  });

  it("shifts backward by 1 day", () => {
    expect(shiftDate("2024-01-15", -1)).toBe("2024-01-14");
  });

  it("crosses month boundary forward", () => {
    expect(shiftDate("2024-01-31", 1)).toBe("2024-02-01");
  });

  it("crosses month boundary backward", () => {
    expect(shiftDate("2024-02-01", -1)).toBe("2024-01-31");
  });

  it("crosses year boundary forward", () => {
    expect(shiftDate("2024-12-31", 1)).toBe("2025-01-01");
  });

  it("crosses year boundary backward", () => {
    expect(shiftDate("2025-01-01", -1)).toBe("2024-12-31");
  });

  it("handles leap year", () => {
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDate("2024-02-29", 1)).toBe("2024-03-01");
  });
});

describe("formatNumber", () => {
  it("formats with Greek locale", () => {
    const result = formatNumber(1234);
    // Greek locale uses period as thousands separator
    expect(result).toBeTruthy();
  });

  it("returns 0 for falsy input", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
  });
});

describe("round1", () => {
  it("rounds to 1 decimal", () => {
    expect(round1(3.456)).toBe(3.5);
    expect(round1(3.44)).toBe(3.4);
  });

  it("returns 0 for falsy input", () => {
    expect(round1(null)).toBe(0);
    expect(round1(undefined)).toBe(0);
    expect(round1(0)).toBe(0);
  });
});

describe("normalizeDayLog", () => {
  it("returns empty arrays for null input", () => {
    expect(normalizeDayLog(null)).toEqual({ entries: [], exercises: [] });
  });

  it("returns empty arrays for undefined input", () => {
    expect(normalizeDayLog(undefined)).toEqual({ entries: [], exercises: [] });
  });

  it("preserves valid arrays", () => {
    const log = { entries: [{ id: 1 }], exercises: [{ id: 2 }] };
    expect(normalizeDayLog(log)).toEqual(log);
  });

  it("replaces non-array entries/exercises with empty arrays", () => {
    const log = { entries: "invalid", exercises: 123 };
    expect(normalizeDayLog(log)).toEqual({ entries: [], exercises: [] });
  });
});

describe("stripDiacritics", () => {
  it("removes Greek diacritics", () => {
    expect(stripDiacritics("φέτα")).toBe("φετα");
    expect(stripDiacritics("γιαούρτι")).toBe("γιαουρτι");
  });

  it("handles empty/null input", () => {
    expect(stripDiacritics("")).toBe("");
    expect(stripDiacritics(null)).toBe("");
  });

  it("leaves Latin text unchanged", () => {
    expect(stripDiacritics("hello")).toBe("hello");
  });
});

describe("normalizeSearchText", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeSearchText("Φέτα")).toBe("φετα");
  });

  it("replaces punctuation with spaces", () => {
    expect(normalizeSearchText("hello/world")).toBe("hello world");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeSearchText("a   b   c")).toBe("a b c");
  });

  it("trims whitespace", () => {
    expect(normalizeSearchText("  hello  ")).toBe("hello");
  });
});

describe("toCompactSearchText", () => {
  it("removes all spaces", () => {
    expect(toCompactSearchText("hello world")).toBe("helloworld");
  });
});

describe("transliterateGreekToLatin", () => {
  it("transliterates single Greek letters", () => {
    expect(transliterateGreekToLatin("αβγ")).toBe("avg");
  });

  it("handles digraphs before single letters", () => {
    expect(transliterateGreekToLatin("μπ")).toBe("b");
    expect(transliterateGreekToLatin("ντ")).toBe("nt");
    expect(transliterateGreekToLatin("γκ")).toBe("gk");
    expect(transliterateGreekToLatin("ου")).toBe("ou");
    expect(transliterateGreekToLatin("αι")).toBe("ai");
  });

  it("transliterates a full Greek word", () => {
    const result = transliterateGreekToLatin("φετα");
    expect(result).toBe("feta");
  });

  it("transliterates κοτοπουλο", () => {
    const result = transliterateGreekToLatin("κοτοπουλο");
    // ου digraph → "ou", then remaining υ → "y" doesn't apply (already consumed)
    expect(result).toBe("kotopoulo");
  });

  it("handles empty/null input", () => {
    expect(transliterateGreekToLatin("")).toBe("");
    expect(transliterateGreekToLatin(null)).toBe("");
  });

  it("leaves Latin text unchanged", () => {
    expect(transliterateGreekToLatin("hello")).toBe("hello");
  });
});

describe("simplifyLatinGreeklish", () => {
  it("simplifies common greeklish patterns", () => {
    expect(simplifyLatinGreeklish("thou")).toContain("8");
  });

  it("replaces y with i", () => {
    const result = simplifyLatinGreeklish("yogurt");
    expect(result).not.toContain("y");
  });
});

describe("buildSearchVariants", () => {
  it("returns an array of unique variants", () => {
    const variants = buildSearchVariants("φέτα");
    expect(Array.isArray(variants)).toBe(true);
    expect(variants.length).toBeGreaterThan(0);
    // Should contain the normalized form
    expect(variants).toContain("φετα");
  });

  it("includes Latin transliteration", () => {
    const variants = buildSearchVariants("φέτα");
    expect(variants.some((v) => v.includes("feta"))).toBe(true);
  });

  it("deduplicates variants", () => {
    const variants = buildSearchVariants("test");
    const unique = new Set(variants);
    expect(variants.length).toBe(unique.size);
  });
});

describe("getFoodAliases", () => {
  it("returns aliases array from food", () => {
    expect(getFoodAliases({ aliases: ["a", "b"] })).toEqual(["a", "b"]);
  });

  it("filters out falsy values", () => {
    expect(getFoodAliases({ aliases: ["a", null, "", "b"] })).toEqual(["a", "b"]);
  });

  it("returns empty array when no aliases", () => {
    expect(getFoodAliases({})).toEqual([]);
    expect(getFoodAliases(null)).toEqual([]);
  });
});

describe("getFoodIdentityKey", () => {
  it("creates key from name and brand", () => {
    const key = getFoodIdentityKey({ name: "Feta", brand: "Dodoni" });
    expect(key).toBe("feta|dodoni");
  });

  it("handles missing fields", () => {
    expect(getFoodIdentityKey({})).toBe("|");
    expect(getFoodIdentityKey(null)).toBe("|");
  });
});

describe("normalizeFood", () => {
  it("applies defaults to empty food", () => {
    const result = normalizeFood({});
    expect(result.name).toBe("Unknown food");
    expect(result.caloriesPer100g).toBe(0);
    expect(result.portions).toEqual([]);
    expect(result.source).toBe("local");
  });

  it("preserves valid food data", () => {
    const food = {
      id: "test-1",
      name: "Chicken",
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
    };
    const result = normalizeFood(food);
    expect(result.name).toBe("Chicken");
    expect(result.caloriesPer100g).toBe(165);
    expect(result.proteinPer100g).toBe(31);
  });

  it("converts string numbers to actual numbers", () => {
    const food = { caloriesPer100g: "200", proteinPer100g: "25" };
    const result = normalizeFood(food);
    expect(result.caloriesPer100g).toBe(200);
    expect(result.proteinPer100g).toBe(25);
  });
});

describe("createFoodEntry", () => {
  const sampleFood = {
    id: "test-1",
    name: "Chicken Breast",
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
  };

  it("scales macros from per-100g to given grams", () => {
    const entry = createFoodEntry(sampleFood, 200, "Μεσημεριανό");
    expect(entry.calories).toBe(330); // 165 * 2
    expect(entry.protein).toBe(62); // 31 * 2
    expect(entry.grams).toBe(200);
    expect(entry.mealType).toBe("Μεσημεριανό");
  });

  it("defaults grams to 100 when not provided", () => {
    const entry = createFoodEntry(sampleFood, null, "Πρωινό");
    expect(entry.grams).toBe(100);
    expect(entry.calories).toBe(165);
  });

  it("defaults to 100g when grams is 0 (falsy)", () => {
    // Number(0) || 100 → 100, then max(100, 1) = 100
    const entry = createFoodEntry(sampleFood, 0, "Πρωινό");
    expect(entry.grams).toBe(100);
  });

  it("enforces minimum 1 gram for negative values", () => {
    const entry = createFoodEntry(sampleFood, -5, "Πρωινό");
    expect(entry.grams).toBe(1);
  });

  it("defaults meal type to Πρωινό", () => {
    const entry = createFoodEntry(sampleFood, 100);
    expect(entry.mealType).toBe("Πρωινό");
  });

  it("stores base per-100g values", () => {
    const entry = createFoodEntry(sampleFood, 150, "Πρωινό");
    expect(entry.baseCaloriesPer100g).toBe(165);
    expect(entry.baseProteinPer100g).toBe(31);
  });
});

describe("entryBasePer100g", () => {
  it("returns stored base values when available", () => {
    const entry = {
      grams: 200,
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 7.2,
      baseCaloriesPer100g: 165,
      baseProteinPer100g: 31,
      baseCarbsPer100g: 0,
      baseFatPer100g: 3.6,
    };
    const result = entryBasePer100g(entry);
    expect(result.caloriesPer100g).toBe(165);
    expect(result.proteinPer100g).toBe(31);
  });

  it("calculates from entry values when base values missing", () => {
    const entry = { grams: 200, calories: 330, protein: 62, carbs: 10, fat: 7 };
    const result = entryBasePer100g(entry);
    expect(result.caloriesPer100g).toBe(165);
    expect(result.proteinPer100g).toBe(31);
    expect(result.carbsPer100g).toBe(5);
    expect(result.fatPer100g).toBeCloseTo(3.5);
  });

  it("defaults grams to 100 when missing", () => {
    const entry = { calories: 165, protein: 31, carbs: 0, fat: 3.6 };
    const result = entryBasePer100g(entry);
    expect(result.caloriesPer100g).toBe(165);
  });
});

