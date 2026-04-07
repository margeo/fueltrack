import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileTab from "../ProfileTab";

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
    expect(screen.getByText(/Προφίλ/)).toBeTruthy();
  });

  it("shows incomplete profile message when not complete", () => {
    renderProfile({ profileComplete: false });
    expect(screen.getByText(/Συμπλήρωσε το προφίλ σου/)).toBeTruthy();
  });

  it("does not show incomplete message when profile is complete", () => {
    renderProfile({ profileComplete: true });
    expect(screen.queryByText(/Συμπλήρωσε το προφίλ σου/)).toBeNull();
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

  it("shows realistic goal warning for safe rate", () => {
    // 5kg in 10 weeks = 0.5 kg/week → realistic
    renderProfile({ goalType: "lose", targetWeightLoss: "5", weeks: "10" });
    expect(screen.getByText(/Ρεαλιστικός στόχος/)).toBeTruthy();
  });

  it("shows aggressive goal warning for fast rate", () => {
    // 10kg in 8 weeks = 1.25 kg/week → aggressive
    renderProfile({ goalType: "lose", targetWeightLoss: "10", weeks: "8" });
    expect(screen.getByText(/Επιθετικός αλλά εφικτός/)).toBeTruthy();
  });

  it("shows unrealistic goal warning for extreme rate", () => {
    // 10kg in 4 weeks = 2.5 kg/week → unrealistic
    renderProfile({ goalType: "lose", targetWeightLoss: "10", weeks: "4" });
    expect(screen.getByText(/Μη ρεαλιστικός στόχος/)).toBeTruthy();
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
