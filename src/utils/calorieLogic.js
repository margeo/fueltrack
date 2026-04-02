import { MODES } from "../data/modes";

export function calculateBMR({ age, gender, height, weight }) {
  const a = Number(age);
  const h = Number(height);
  const w = Number(weight);

  if (!a || !h || !w) return 0;

  if (gender === "female") {
    return Math.round(10 * w + 6.25 * h - 5 * a - 161);
  }

  return Math.round(10 * w + 6.25 * h - 5 * a + 5);
}

export function calculateTDEE({ bmr, activity }) {
  return Math.round(Number(bmr || 0) * Number(activity || 1.2));
}

export function calculateDailyDeficit({ kilos, weeks }) {
  const kg = Number(kilos);
  const w = Number(weeks);

  if (!kg || !w) return 0;

  const total = kg * 7700;
  const days = w * 7;

  return Math.round(total / days);
}

export function calculateAppliedDailyDeficit(rawDeficit) {
  const deficit = Number(rawDeficit || 0);
  if (!deficit) return 0;
  return Math.min(Math.max(deficit, 150), 1000);
}

export function calculateTargetCalories({
  goalType,
  tdee,
  targetWeightChange,
  weeks
}) {
  const base = Number(tdee || 0);

  if (!base) return 0;

  if (goalType === "maintain") return base;
  if (goalType === "fitness") return base; // TDEE — focus σε cardio, όχι έλλειμμα
  if (goalType === "gain") return Math.round(base + 300);

  if (goalType === "lose") {
    const rawDeficit = calculateDailyDeficit({
      kilos: targetWeightChange,
      weeks
    });

    const appliedDeficit = calculateAppliedDailyDeficit(rawDeficit);

    return Math.max(Math.round(base - appliedDeficit), 1200);
  }

  return base;
}

export function calculateProteinTarget({ weight, goalType, modeKey }) {
  const w = Number(weight || 0);
  if (!w) return 0;

  if (modeKey === "high_protein") return Math.round(w * 2.2);
  if (goalType === "gain") return Math.round(w * 2.0);
  if (goalType === "lose") return Math.round(w * 1.8);
  if (goalType === "fitness") return Math.round(w * 1.6); // moderate protein, cardio focus

  return Math.round(w * 1.6);
}

export function calculateMacroTargets({
  targetCalories,
  proteinTarget,
  modeKey = "balanced"
}) {
  const mode = MODES[modeKey] || MODES.balanced;
  const calories = Number(targetCalories || 0);

  if (!calories) {
    return {
      carbsGrams: 0,
      proteinGrams: proteinTarget || 0,
      fatGrams: 0
    };
  }

  const proteinCalories = proteinTarget * 4;
  const remaining = Math.max(calories - proteinCalories, 0);

  const carbsCalories =
    remaining * (mode.carbsPercent / (mode.carbsPercent + mode.fatPercent));
  const fatCalories =
    remaining * (mode.fatPercent / (mode.carbsPercent + mode.fatPercent));

  return {
    carbsGrams: Math.round(carbsCalories / 4),
    proteinGrams: Math.round(proteinCalories / 4),
    fatGrams: Math.round(fatCalories / 9)
  };
}