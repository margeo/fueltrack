import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ExerciseTab from "../ExerciseTab";

// Mock GoogleFitButton
vi.mock("../../GoogleFitButton", () => ({
  default: () => <div data-testid="google-fit-btn" />,
}));

const sampleExercise = {
  id: 1, name: "Τρέξιμο", minutes: 30, calories: 300,
};

const defaultProps = {
  exercises: [],
  exerciseValue: 0,
  exerciseMinutes: "30",
  setExerciseMinutes: vi.fn(),
  customExerciseName: "",
  setCustomExerciseName: vi.fn(),
  customExerciseMinutes: "",
  setCustomExerciseMinutes: vi.fn(),
  customExerciseRate: "",
  setCustomExerciseRate: vi.fn(),
  addExerciseByMinutes: vi.fn(),
  addCustomExercise: vi.fn(),
  deleteExercise: vi.fn(),
  selectedDate: "2024-06-15",
  updateCurrentDay: vi.fn(),
  favoriteExerciseKeys: [],
  toggleFavoriteExercise: vi.fn(),
  isFavoriteExercise: vi.fn(() => false),
  recentExercises: [],
  quickAddRecentExercise: vi.fn(),
};

function renderExerciseTab(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  return { ...render(<ExerciseTab {...props} />), props };
}

describe("ExerciseTab", () => {
  it("renders the daily exercise heading", () => {
    renderExerciseTab();
    expect(screen.getByText(/Άσκηση ημέρας/)).toBeTruthy();
  });

  it("shows empty state when no exercises", () => {
    renderExerciseTab({ exercises: [] });
    expect(screen.getByText(/Δεν έχεις βάλει άσκηση ακόμα/)).toBeTruthy();
  });

  it("shows exercises when they exist", () => {
    renderExerciseTab({ exercises: [sampleExercise], exerciseValue: 300 });
    expect(screen.getByText("Τρέξιμο")).toBeTruthy();
    const matches = screen.getAllByText(/300 kcal/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders category filter buttons", () => {
    renderExerciseTab();
    expect(screen.getByText("Όλα")).toBeTruthy();
    expect(screen.getByText("🏃 Cardio")).toBeTruthy();
    expect(screen.getByText("🏋️ Gym")).toBeTruthy();
    expect(screen.getByText("🔥 Training")).toBeTruthy();
    expect(screen.getByText("⚽ Sports")).toBeTruthy();
  });

  it("renders exercise search input", () => {
    renderExerciseTab();
    expect(screen.getByPlaceholderText(/Αναζήτηση άσκησης/)).toBeTruthy();
  });

  it("renders exercise dropdown", () => {
    renderExerciseTab();
    expect(screen.getByText("— Επίλεξε άσκηση —")).toBeTruthy();
  });

  it("shows exercise options from library in dropdown", () => {
    renderExerciseTab();
    // Check that exercises from EXERCISE_LIBRARY appear
    expect(screen.getByText(/Περπάτημα/)).toBeTruthy();
    expect(screen.getByText(/Τρέξιμο · 10 kcal/)).toBeTruthy();
  });

  it("shows preview when exercise is selected", () => {
    renderExerciseTab();
    const select = screen.getByDisplayValue("— Επίλεξε άσκηση —");
    fireEvent.change(select, { target: { value: "Περπάτημα" } });
    // Should show the exercise preview panel with cancel button
    expect(screen.getByText("Άκυρο")).toBeTruthy();
    // Both the preview and custom form have "Προσθήκη"
    expect(screen.getAllByText("Προσθήκη").length).toBeGreaterThanOrEqual(2);
  });

  it("renders custom exercise form", () => {
    renderExerciseTab();
    expect(screen.getByText("Custom άσκηση")).toBeTruthy();
    expect(screen.getByPlaceholderText("Όνομα άσκησης")).toBeTruthy();
    expect(screen.getByPlaceholderText("Λεπτά")).toBeTruthy();
    expect(screen.getByPlaceholderText("kcal/λεπτό")).toBeTruthy();
  });

  it("calls deleteExercise when delete clicked", () => {
    const deleteExercise = vi.fn();
    renderExerciseTab({ exercises: [sampleExercise], deleteExercise });
    fireEvent.click(screen.getByText("✕"));
    expect(deleteExercise).toHaveBeenCalledWith(1);
  });

  it("shows empty favorites message", () => {
    renderExerciseTab();
    expect(screen.getByText(/Δεν έχεις αγαπημένες ασκήσεις ακόμα/)).toBeTruthy();
  });

  it("filters exercises by category", () => {
    renderExerciseTab();
    fireEvent.click(screen.getByText(/Sports/));
    const select = screen.getByDisplayValue("— Επίλεξε άσκηση —");
    // After filtering to Sports, gym exercises should not appear
    const options = select.querySelectorAll("option");
    const optionTexts = Array.from(options).map((o) => o.textContent);
    expect(optionTexts.some((t) => t.includes("Ποδόσφαιρο"))).toBe(true);
    expect(optionTexts.some((t) => t.includes("Gym session"))).toBe(false);
  });

  it("does not show recent section when no recent exercises", () => {
    renderExerciseTab({ recentExercises: [] });
    expect(screen.queryByText("Πρόσφατα")).toBeNull();
  });
});
