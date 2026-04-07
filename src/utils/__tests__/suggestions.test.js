import { describe, it, expect } from "vitest";
import { getSuggestedFoods } from "../suggestions";

const sampleFoods = [
  { name: "Chicken Breast", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { name: "Rice", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
  { name: "Avocado", caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 8.5, fatPer100g: 15 },
  { name: "Eggs", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
  { name: "Salmon", caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13 },
  { name: "Bread", caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2 },
  { name: "Olive Oil", caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 },
  { name: "Broccoli", caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4 },
  { name: "Greek Yogurt", caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.7 },
];

describe("getSuggestedFoods", () => {
  it("returns empty array for empty foods list", () => {
    expect(getSuggestedFoods({ foods: [], modeKey: "balanced", remainingCalories: 500, remainingProtein: 50 })).toEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(getSuggestedFoods({ foods: null, modeKey: "balanced", remainingCalories: 500, remainingProtein: 50 })).toEqual([]);
  });

  it("returns at most 5 foods", () => {
    const result = getSuggestedFoods({
      foods: sampleFoods,
      modeKey: "balanced",
      remainingCalories: 1000,
      remainingProtein: 50,
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("filters out foods with 0 calories", () => {
    const foods = [
      { name: "Water", caloriesPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 },
      { name: "Chicken", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
    ];
    const result = getSuggestedFoods({
      foods,
      modeKey: "balanced",
      remainingCalories: 500,
      remainingProtein: 30,
    });
    expect(result.every((f) => f.caloriesPer100g > 0)).toBe(true);
  });

  it("filters high-calorie foods when remaining calories are low", () => {
    const result = getSuggestedFoods({
      foods: sampleFoods,
      modeKey: "balanced",
      remainingCalories: 100,
      remainingProtein: 20,
    });
    // max allowed = max(100, 250) + 120 = 370
    // Olive Oil (884) should be excluded
    expect(result.find((f) => f.name === "Olive Oil")).toBeUndefined();
  });

  it("prioritizes high protein foods when remaining protein is high", () => {
    const result = getSuggestedFoods({
      foods: sampleFoods,
      modeKey: "balanced",
      remainingCalories: 1000,
      remainingProtein: 60,
    });
    // Chicken (31g protein) should rank highly
    expect(result[0].proteinPer100g).toBeGreaterThan(10);
  });

  describe("keto mode", () => {
    it("excludes foods with more than 8g carbs per 100g", () => {
      const result = getSuggestedFoods({
        foods: sampleFoods,
        modeKey: "keto",
        remainingCalories: 1000,
        remainingProtein: 40,
      });
      expect(result.every((f) => Number(f.carbsPer100g) <= 8)).toBe(true);
      // Rice (28g carbs), Avocado (8.5g carbs), Bread (49g carbs) should be excluded
      expect(result.find((f) => f.name === "Rice")).toBeUndefined();
      expect(result.find((f) => f.name === "Bread")).toBeUndefined();
      expect(result.find((f) => f.name === "Avocado")).toBeUndefined();
    });

    it("penalizes carbs heavily in scoring", () => {
      const result = getSuggestedFoods({
        foods: sampleFoods,
        modeKey: "keto",
        remainingCalories: 1000,
        remainingProtein: 40,
      });
      // Foods with 0 carbs should rank high
      if (result.length > 0) {
        expect(result[0].carbsPer100g).toBeLessThanOrEqual(8);
      }
    });
  });

  describe("low_carb mode", () => {
    it("excludes foods with more than 15g carbs per 100g", () => {
      const result = getSuggestedFoods({
        foods: sampleFoods,
        modeKey: "low_carb",
        remainingCalories: 1000,
        remainingProtein: 40,
      });
      expect(result.every((f) => Number(f.carbsPer100g) <= 15)).toBe(true);
      // Rice (28g carbs), Bread (49g carbs) should be excluded
      expect(result.find((f) => f.name === "Rice")).toBeUndefined();
      expect(result.find((f) => f.name === "Bread")).toBeUndefined();
    });
  });

  describe("high_protein mode", () => {
    it("gives extra weight to protein in scoring", () => {
      const result = getSuggestedFoods({
        foods: sampleFoods,
        modeKey: "high_protein",
        remainingCalories: 1000,
        remainingProtein: 60,
      });
      // Top result should be a high-protein food
      expect(result[0].proteinPer100g).toBeGreaterThan(10);
    });
  });

  it("balanced mode includes all food types", () => {
    const result = getSuggestedFoods({
      foods: sampleFoods,
      modeKey: "balanced",
      remainingCalories: 1000,
      remainingProtein: 40,
    });
    expect(result.length).toBe(5);
  });
});
