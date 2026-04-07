import { describe, it, expect } from "vitest";
import {
  calculateBMR,
  calculateTDEE,
  calculateDailyDeficit,
  calculateAppliedDailyDeficit,
  calculateTargetCalories,
  calculateProteinTarget,
  calculateMacroTargets,
} from "../calorieLogic";

describe("calculateBMR", () => {
  it("calculates BMR for male using Mifflin-St Jeor", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR({ age: 30, gender: "male", height: 180, weight: 80 })).toBe(1780);
  });

  it("calculates BMR for female using Mifflin-St Jeor", () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 → 1345
    expect(calculateBMR({ age: 25, gender: "female", height: 165, weight: 60 })).toBe(1345);
  });

  it("returns 0 when age is missing", () => {
    expect(calculateBMR({ age: 0, gender: "male", height: 180, weight: 80 })).toBe(0);
  });

  it("returns 0 when height is missing", () => {
    expect(calculateBMR({ age: 30, gender: "male", height: 0, weight: 80 })).toBe(0);
  });

  it("returns 0 when weight is missing", () => {
    expect(calculateBMR({ age: 30, gender: "male", height: 180, weight: 0 })).toBe(0);
  });

  it("converts string inputs to numbers", () => {
    expect(calculateBMR({ age: "30", gender: "male", height: "180", weight: "80" })).toBe(1780);
  });

  it("defaults to male formula for unknown gender", () => {
    const male = calculateBMR({ age: 30, gender: "male", height: 180, weight: 80 });
    const unknown = calculateBMR({ age: 30, gender: "other", height: 180, weight: 80 });
    expect(unknown).toBe(male);
  });
});

describe("calculateTDEE", () => {
  it("applies sedentary multiplier", () => {
    expect(calculateTDEE({ bmr: 1780, activity: 1.2 })).toBe(2136);
  });

  it("applies active multiplier", () => {
    expect(calculateTDEE({ bmr: 1780, activity: 1.55 })).toBe(2759);
  });

  it("defaults activity to 1.2 when missing", () => {
    expect(calculateTDEE({ bmr: 1780 })).toBe(2136);
  });

  it("returns 0 when bmr is missing", () => {
    expect(calculateTDEE({ activity: 1.5 })).toBe(0);
  });
});

describe("calculateDailyDeficit", () => {
  it("calculates deficit for 5kg in 10 weeks", () => {
    // 5 * 7700 / (10 * 7) = 38500 / 70 = 550
    expect(calculateDailyDeficit({ kilos: 5, weeks: 10 })).toBe(550);
  });

  it("returns 0 when kilos is 0", () => {
    expect(calculateDailyDeficit({ kilos: 0, weeks: 10 })).toBe(0);
  });

  it("returns 0 when weeks is 0", () => {
    expect(calculateDailyDeficit({ kilos: 5, weeks: 0 })).toBe(0);
  });

  it("handles large weight loss in short time", () => {
    // 10 * 7700 / (4 * 7) = 77000 / 28 = 2750
    expect(calculateDailyDeficit({ kilos: 10, weeks: 4 })).toBe(2750);
  });
});

describe("calculateAppliedDailyDeficit", () => {
  it("clamps deficit to minimum 150", () => {
    expect(calculateAppliedDailyDeficit(50)).toBe(150);
  });

  it("clamps deficit to maximum 1000", () => {
    expect(calculateAppliedDailyDeficit(2000)).toBe(1000);
  });

  it("passes through value in valid range", () => {
    expect(calculateAppliedDailyDeficit(500)).toBe(500);
  });

  it("returns 0 for zero input", () => {
    expect(calculateAppliedDailyDeficit(0)).toBe(0);
  });

  it("returns 0 for null/undefined", () => {
    expect(calculateAppliedDailyDeficit(null)).toBe(0);
    expect(calculateAppliedDailyDeficit(undefined)).toBe(0);
  });
});

describe("calculateTargetCalories", () => {
  it("returns TDEE for maintain goal", () => {
    expect(calculateTargetCalories({ goalType: "maintain", tdee: 2200 })).toBe(2200);
  });

  it("returns TDEE for fitness goal", () => {
    expect(calculateTargetCalories({ goalType: "fitness", tdee: 2200 })).toBe(2200);
  });

  it("returns TDEE + 300 for gain goal", () => {
    expect(calculateTargetCalories({ goalType: "gain", tdee: 2200 })).toBe(2500);
  });

  it("applies clamped deficit for lose goal", () => {
    // 5kg in 10 weeks = 550 deficit, within 150-1000 range
    const result = calculateTargetCalories({
      goalType: "lose",
      tdee: 2200,
      targetWeightChange: 5,
      weeks: 10,
    });
    expect(result).toBe(2200 - 550);
  });

  it("enforces minimum 1200 calories for lose goal", () => {
    const result = calculateTargetCalories({
      goalType: "lose",
      tdee: 1400,
      targetWeightChange: 10,
      weeks: 4,
    });
    // deficit would be 2750, clamped to 1000 → 1400-1000=400, floored to 1200
    expect(result).toBe(1200);
  });

  it("returns 0 when TDEE is missing", () => {
    expect(calculateTargetCalories({ goalType: "maintain", tdee: 0 })).toBe(0);
  });

  it("returns TDEE for unknown goal type", () => {
    expect(calculateTargetCalories({ goalType: "unknown", tdee: 2200 })).toBe(2200);
  });
});

describe("calculateProteinTarget", () => {
  it("returns 2.2g/kg for high_protein mode", () => {
    expect(calculateProteinTarget({ weight: 80, goalType: "maintain", modeKey: "high_protein" })).toBe(176);
  });

  it("returns 2.0g/kg for gain goal", () => {
    expect(calculateProteinTarget({ weight: 80, goalType: "gain" })).toBe(160);
  });

  it("returns 1.8g/kg for lose goal", () => {
    expect(calculateProteinTarget({ weight: 80, goalType: "lose" })).toBe(144);
  });

  it("returns 1.6g/kg for fitness goal", () => {
    expect(calculateProteinTarget({ weight: 80, goalType: "fitness" })).toBe(128);
  });

  it("returns 1.6g/kg for maintain goal (default)", () => {
    expect(calculateProteinTarget({ weight: 80, goalType: "maintain" })).toBe(128);
  });

  it("returns 0 when weight is missing", () => {
    expect(calculateProteinTarget({ weight: 0, goalType: "lose" })).toBe(0);
  });

  it("high_protein mode overrides goal type", () => {
    const hp = calculateProteinTarget({ weight: 80, goalType: "lose", modeKey: "high_protein" });
    const lose = calculateProteinTarget({ weight: 80, goalType: "lose" });
    expect(hp).toBeGreaterThan(lose);
  });
});

describe("calculateMacroTargets", () => {
  it("calculates balanced macros correctly", () => {
    const result = calculateMacroTargets({
      targetCalories: 2000,
      proteinTarget: 150,
      modeKey: "balanced",
    });
    // protein: 150*4=600 cal → 150g
    // remaining: 2000-600=1400
    // balanced: carbs 40%, fat 30% → ratio 40:30
    // carbs: 1400 * (40/70) = 800 cal → 200g
    // fat: 1400 * (30/70) = 600 cal → 66.67g → 67g
    expect(result.proteinGrams).toBe(150);
    expect(result.carbsGrams).toBe(200);
    expect(result.fatGrams).toBe(67);
  });

  it("calculates keto macros with high fat ratio", () => {
    const result = calculateMacroTargets({
      targetCalories: 2000,
      proteinTarget: 120,
      modeKey: "keto",
    });
    // keto: carbs 8%, fat 65% → ratio 8:65
    // protein: 120*4=480 cal, remaining: 1520
    // carbs: 1520 * (8/73) = 166.6 cal → 42g
    // fat: 1520 * (65/73) = 1353.4 cal → 150g
    expect(result.fatGrams).toBeGreaterThan(result.carbsGrams);
    expect(result.proteinGrams).toBe(120);
  });

  it("returns zeros with zero calories", () => {
    const result = calculateMacroTargets({
      targetCalories: 0,
      proteinTarget: 150,
      modeKey: "balanced",
    });
    expect(result.carbsGrams).toBe(0);
    expect(result.proteinGrams).toBe(150);
    expect(result.fatGrams).toBe(0);
  });

  it("defaults to balanced mode for unknown mode", () => {
    const balanced = calculateMacroTargets({
      targetCalories: 2000,
      proteinTarget: 150,
      modeKey: "balanced",
    });
    const unknown = calculateMacroTargets({
      targetCalories: 2000,
      proteinTarget: 150,
      modeKey: "nonexistent",
    });
    expect(unknown).toEqual(balanced);
  });

  it("handles case where protein exceeds total calories", () => {
    const result = calculateMacroTargets({
      targetCalories: 400,
      proteinTarget: 150,
      modeKey: "balanced",
    });
    // protein: 150*4=600, exceeds 400 → remaining = max(400-600, 0) = 0
    expect(result.carbsGrams).toBe(0);
    expect(result.fatGrams).toBe(0);
    expect(result.proteinGrams).toBe(150);
  });
});
