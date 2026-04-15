import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SummaryTab from "../SummaryTab";

// SummaryTab's hero card has a collapsible Macros section whose open
// state is read from sessionStorage key "ft_sum_macros" (default false).
// Tests that assert on macro bars need that section expanded, so pre-
// seed sessionStorage before every test to keep assertions stable.
beforeEach(() => {
  sessionStorage.setItem("ft_sum_macros", "true");
});

// Mock AiCoach
vi.mock("../../AiCoach", () => ({
  default: () => <div data-testid="ai-coach" />,
}));

const defaultProps = {
  selectedDate: "2024-06-15",
  setSelectedDate: vi.fn(),
  isToday: true,
  targetCalories: 2000,
  totalCalories: 1200,
  exerciseValue: 200,
  remainingCalories: 1000,
  progress: 60,
  goalType: "lose",
  last7Days: [],
  proteinTarget: 144,
  totalProtein: 80,
  totalCarbs: 120,
  totalFat: 40,
  mode: "balanced",
  macroTargets: { proteinGrams: 144, carbsGrams: 200, fatGrams: 67 },
  foods: [],
  dailyLogs: {},
  weightLog: [],
  onAddWeight: vi.fn(),
  onDeleteWeight: vi.fn(),
  favoriteFoods: [],
  favoriteFoodsText: "",
  favoriteExercisesText: "",
  favoriteExercises: [],
  age: "30",
  weight: "80",
  height: "180",
  gender: "male",
  savedPlans: [],
  onSavePlan: vi.fn(),
  onDeletePlan: vi.fn(),
};

function renderSummary(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  return { ...render(<SummaryTab {...props} />), props };
}

describe("SummaryTab", () => {
  it("renders the summary heading", () => {
    renderSummary();
    expect(screen.getByText("Σύνοψη ημέρας")).toBeTruthy();
  });

  it("displays remaining calories", () => {
    renderSummary({ remainingCalories: 1000 });
    // Number appears twice: summary hero row + donut centre.
    expect(screen.getAllByText("1.000").length).toBeGreaterThanOrEqual(1);
  });

  it("displays target calories", () => {
    renderSummary({ targetCalories: 2000 });
    expect(screen.getByText("2.000")).toBeTruthy();
  });

  it("displays food calories", () => {
    renderSummary({ totalCalories: 1200 });
    expect(screen.getByText("1.200")).toBeTruthy();
  });

  it("displays exercise calories", () => {
    renderSummary({ exerciseValue: 200 });
    expect(screen.getByText("200")).toBeTruthy();
  });

  it("shows Σήμερα label when isToday", () => {
    renderSummary({ isToday: true });
    expect(screen.getByText(/Σήμερα/)).toBeTruthy();
  });

  it("shows Σήμερα button when not today", () => {
    renderSummary({ isToday: false });
    expect(screen.getAllByText("Σήμερα").length).toBeGreaterThanOrEqual(1);
  });

  it("shows goal label for lose", () => {
    renderSummary({ goalType: "lose" });
    expect(screen.getByText(/Απώλεια βάρους/)).toBeTruthy();
  });

  it("shows goal label for gain", () => {
    renderSummary({ goalType: "gain" });
    expect(screen.getByText(/Μυϊκή ανάπτυξη/)).toBeTruthy();
  });

  it("shows goal label for maintain", () => {
    renderSummary({ goalType: "maintain" });
    expect(screen.getByText(/Διατήρηση/)).toBeTruthy();
  });

  it("shows goal label for fitness", () => {
    renderSummary({ goalType: "fitness" });
    expect(screen.getByText(/Fitness & Cardio/)).toBeTruthy();
  });

  it("shows mode label", () => {
    renderSummary({ mode: "keto" });
    expect(screen.getByText(/Keto/)).toBeTruthy();
  });

  it("renders macro bars section", () => {
    renderSummary();
    // Labels are rendered with a leading emoji (e.g. "🥩 Protein"),
    // so assert containment rather than exact text.
    expect(screen.getByText(/Protein/)).toBeTruthy();
    expect(screen.getByText(/Carbs/)).toBeTruthy();
    expect(screen.getByText(/Fat/)).toBeTruthy();
  });

  it("shows macro values with targets", () => {
    renderSummary({
      totalProtein: 80,
      macroTargets: { proteinGrams: 144, carbsGrams: 200, fatGrams: 67 },
    });
    // Current and target grams render as siblings ("80g" + " / 144g"),
    // so getByText with a single regex won't span both nodes. Query
    // each piece independently.
    expect(screen.getByText(/80g/)).toBeTruthy();
    expect(screen.getByText(/144g/)).toBeTruthy();
  });

  it("shows protein in macro bars", () => {
    renderSummary({ proteinTarget: 144, totalProtein: 80 });
    expect(screen.getByText(/80g/)).toBeTruthy();
    expect(screen.getByText(/144g/)).toBeTruthy();
  });

  it("renders plans section", () => {
    renderSummary();
    expect(screen.getByText(/Πρόγραμμα διατροφής/)).toBeTruthy();
    expect(screen.getByText(/Πρόγραμμα γυμναστικής/)).toBeTruthy();
  });

  it("shows empty plan message when no plans", () => {
    renderSummary({ savedPlans: [] });
    expect(screen.getByText(/Δεν έχεις ακόμα πρόγραμμα διατροφής/)).toBeTruthy();
  });

  it("renders AI Coach component", () => {
    renderSummary();
    expect(document.querySelector("[data-testid='ai-coach']")).toBeTruthy();
  });

  it("remaining color is green when above 100", () => {
    renderSummary({ remainingCalories: 500 });
    // First match is the summary hero row div (DOM order); the donut
    // <text> comes after and uses SVG fill, not CSS color.
    const remainingEl = screen.getAllByText("500")[0];
    expect(remainingEl.style.color).toBe("rgb(134, 239, 172)"); // #86efac
  });

  it("remaining color is red when below -150", () => {
    renderSummary({ remainingCalories: -200 });
    const remainingEl = screen.getAllByText("-200")[0];
    expect(remainingEl.style.color).toBe("rgb(252, 165, 165)"); // #fca5a5
  });

  it("remaining color is yellow when near zero", () => {
    renderSummary({ remainingCalories: 50 });
    const remainingEl = screen.getAllByText("50")[0];
    expect(remainingEl.style.color).toBe("rgb(253, 230, 138)"); // #fde68a
  });

  it("renders progress bar", () => {
    renderSummary({ progress: 60 });
    const inner = document.querySelector(".progress-inner");
    expect(inner.style.width).toBe("60%");
  });
});
