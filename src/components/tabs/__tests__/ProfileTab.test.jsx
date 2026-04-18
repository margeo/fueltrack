import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileTab from "../ProfileTab";

// ProfileTab's Your Target / Food Profile / Exercise Profile cards are
// collapsible, with open state persisted in sessionStorage under
// "ft_profile_prefs" (default all collapsed). Tests that assert on
// goal fields and warning banners need Your Target and the Goal
// subsection expanded — pre-seed sessionStorage in beforeEach.
beforeEach(() => {
  sessionStorage.setItem(
    "ft_profile_prefs",
    JSON.stringify({ target_section: true, goal_section: true, analysis_section: true })
  );
});

const defaultProps = {
  age: "30", setAge: vi.fn(),
  gender: "male", setGender: vi.fn(),
  height: "180", setHeight: vi.fn(),
  weight: "80", setWeight: vi.fn(),
  activity: "1.4", setActivity: vi.fn(),
  goalType: "lose", setGoalType: vi.fn(),
  mode: "balanced", setMode: vi.fn(),
  targetWeightLoss: "5", setTargetWeightLoss: vi.fn(),
  weeks: "10", setWeeks: vi.fn(),
  tdee: 2200,
  targetCalories: 1650,
  dailyDeficit: 550,
  proteinTarget: 144,
  profileComplete: true,
  onContinue: vi.fn(),
  session: null,
  mealsPerDay: "3", setMealsPerDay: vi.fn(),
  snacksPerDay: "1", setSnacksPerDay: vi.fn(),
  foodCategories: [], setFoodCategories: vi.fn(),
  allergies: [], setAllergies: vi.fn(),
  cookingLevel: "", setCookingLevel: vi.fn(),
  cookingTime: "", setCookingTime: vi.fn(),
  simpleMode: false, setSimpleMode: vi.fn(),
  fitnessLevel: "", setFitnessLevel: vi.fn(),
  workoutLocation: "", setWorkoutLocation: vi.fn(),
  equipment: [], setEquipment: vi.fn(),
  limitations: "", setLimitations: vi.fn(),
  workoutFrequency: "", setWorkoutFrequency: vi.fn(),
  sessionDuration: "", setSessionDuration: vi.fn(),
  fitnessGoals: [], setFitnessGoals: vi.fn(),
  exerciseCategories: [], setExerciseCategories: vi.fn(),
};

function renderProfile(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  // Reset all fns
  Object.keys(props).forEach((key) => {
    if (typeof props[key] === "function") props[key] = vi.fn();
  });
  Object.assign(props, overrides);
  const result = render(<ProfileTab {...props} />);
  return { ...result, props };
}

describe("ProfileTab", () => {
  it("renders the profile heading", () => {
    renderProfile();
    expect(screen.getAllByText(/Προφίλ/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows incomplete profile message when not complete", () => {
    renderProfile({ profileComplete: false });
    // ProfileTab renders t("app.fillProfile") which reads
    // "Ξεκίνα συμπληρώνοντας το προφίλ σου" from the current locale.
    expect(screen.getByText(/συμπληρώνοντας το προφίλ σου/)).toBeTruthy();
  });

  it("does not show incomplete message when profile is complete", () => {
    renderProfile({ profileComplete: true });
    expect(screen.queryByText(/συμπληρώνοντας το προφίλ σου/)).toBeNull();
  });

  it("renders weight input with current value", () => {
    renderProfile();
    expect(screen.getByDisplayValue("80")).toBeTruthy();
  });

  it("renders height input with current value", () => {
    renderProfile();
    expect(screen.getByDisplayValue("180")).toBeTruthy();
  });

  it("renders age input with current value", () => {
    renderProfile();
    expect(screen.getByDisplayValue("30")).toBeTruthy();
  });

  it("renders goal type selector with current value", () => {
    renderProfile({ goalType: "lose" });
    expect(screen.getByDisplayValue("Lose weight")).toBeTruthy();
  });

  it("shows goal fields when goalType is lose", () => {
    renderProfile({ goalType: "lose" });
    expect(screen.getByText(/Θέλω να χάσω/)).toBeTruthy();
  });

  it("shows goal fields when goalType is gain", () => {
    renderProfile({ goalType: "gain" });
    expect(screen.getByText(/Θέλω να πάρω/)).toBeTruthy();
  });

  it("hides goal fields when goalType is maintain", () => {
    renderProfile({ goalType: "maintain" });
    expect(screen.queryByText(/Θέλω να χάσω/)).toBeNull();
    expect(screen.queryByText(/Θέλω να πάρω/)).toBeNull();
  });

  it("hides goal fields when goalType is fitness", () => {
    renderProfile({ goalType: "fitness" });
    expect(screen.queryByText(/Θέλω να χάσω/)).toBeNull();
  });

  it("calls setGoalType when goal selector changes", () => {
    const { props } = renderProfile();
    const select = screen.getByDisplayValue("Lose weight");
    fireEvent.change(select, { target: { value: "maintain" } });
    expect(props.setGoalType).toHaveBeenCalledWith("maintain");
  });

  it("shows sustainable goal warning for a slow rate", () => {
    // 80kg user, 4kg in 12 weeks = 0.333 kg/week = 0.42% bw/wk → sustainable
    renderProfile({ goalType: "lose", weight: "80", targetWeightLoss: "4", weeks: "12" });
    expect(screen.getByText(/Βιώσιμος ρυθμός/)).toBeTruthy();
  });

  it("shows fast-progress warning for a moderate rate", () => {
    // 80kg user, 5kg in 10 weeks = 0.5 kg/wk = 0.625% bw/wk → fast progress
    renderProfile({ goalType: "lose", weight: "80", targetWeightLoss: "5", weeks: "10" });
    expect(screen.getByText(/Γρήγορη πρόοδος/)).toBeTruthy();
  });

  it("shows very-aggressive warning for a fast rate", () => {
    // 80kg user, 10kg in 8 weeks = 1.25 kg/wk = 1.5625% bw/wk → very aggressive
    renderProfile({ goalType: "lose", weight: "80", targetWeightLoss: "10", weeks: "8" });
    expect(screen.getByText(/Πολύ επιθετικός/)).toBeTruthy();
  });

  it("shows extreme warning for a dangerous rate", () => {
    // 80kg user, 10kg in 4 weeks = 2.5 kg/wk = 3.125% bw/wk → extreme
    renderProfile({ goalType: "lose", weight: "80", targetWeightLoss: "10", weeks: "4" });
    expect(screen.getByText(/Ακραίος/)).toBeTruthy();
  });

  it("shows gender, activity, and diet mode in main card", () => {
    renderProfile();
    expect(screen.getByText("Άνδρας")).toBeTruthy();
  });

  it("shows diet mode description", () => {
    renderProfile({ mode: "keto" });
    expect(screen.getByText(/Κετογονική/)).toBeTruthy();
  });

  it("shows fasting info for fasting modes", () => {
    renderProfile({ mode: "fasting_16_8" });
    const matches = screen.getAllByText(/Νηστεία 16ω/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders privacy policy link", () => {
    renderProfile();
    const link = screen.getByText("Privacy Policy");
    expect(link.getAttribute("href")).toBe("/privacy.html");
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
