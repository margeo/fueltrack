import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FoodTab from "../FoodTab";

// Mock useFoodSearch hook
vi.mock("../../../hooks/useFoodSearch", () => ({
  default: () => ({ results: [], loading: false }),
}));

// Mock BarcodeScanner and FoodPhotoAnalyzer
vi.mock("../../BarcodeScanner", () => ({
  default: ({ onClose }) => <div data-testid="barcode-scanner"><button onClick={onClose}>close-scanner</button></div>,
}));
vi.mock("../../FoodPhotoAnalyzer", () => ({
  default: ({ onClose }) => <div data-testid="photo-analyzer"><button onClick={onClose}>close-photo</button></div>,
}));

const sampleEntry = {
  id: 1, name: "Chicken Breast", brand: "", grams: 150,
  calories: 248, protein: 46.5, carbs: 0, fat: 5.4, mealType: "Μεσημεριανό",
};

const sampleFood = {
  id: "food-1", name: "Feta", brand: "Dodoni", source: "local",
  caloriesPer100g: 264, proteinPer100g: 17, carbsPer100g: 1.5, fatPer100g: 21,
};

const defaultProps = {
  foods: [sampleFood],
  customFoods: [],
  onAddCustomFood: vi.fn(),
  onDeleteCustomFood: vi.fn(),
  recentFoods: [],
  favoriteFoods: [],
  isFavorite: vi.fn(() => false),
  toggleFavorite: vi.fn(),
  saveRecentFood: vi.fn(),
  updateCurrentDay: vi.fn(),
  quickAddRecent: vi.fn(),
  quickAddFavorite: vi.fn(),
  entries: [],
  groupedEntries: {},
  deleteEntry: vi.fn(),
  openEditEntry: vi.fn(),
  dietType: "",
  setDietType: vi.fn(),
  allergies: [],
  setAllergies: vi.fn(),
  cookingLevel: "",
  setCookingLevel: vi.fn(),
  cookingTime: "",
  setCookingTime: vi.fn(),
};

function renderFoodTab(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  return { ...render(<FoodTab {...props} />), props };
}

describe("FoodTab", () => {
  it("renders the daily food heading", () => {
    renderFoodTab();
    expect(screen.getByText(/Φαγητό ημέρας/)).toBeTruthy();
  });

  it("shows empty state when no entries", () => {
    renderFoodTab({ entries: [] });
    expect(screen.getByText(/Δεν έχεις βάλει φαγητό ακόμα/)).toBeTruthy();
  });

  it("shows entries grouped by meal", () => {
    renderFoodTab({
      entries: [sampleEntry],
      groupedEntries: {
        "Μεσημεριανό": { items: [sampleEntry], totalCalories: 248 },
      },
    });
    expect(screen.getByText("Chicken Breast")).toBeTruthy();
    expect(screen.getByText("Μεσημεριανό")).toBeTruthy();
  });

  it("shows total calories for the day", () => {
    renderFoodTab({ entries: [sampleEntry] });
    expect(screen.getByText(/248 kcal/)).toBeTruthy();
  });

  it("renders food search input", () => {
    renderFoodTab();
    expect(screen.getByPlaceholderText("Γράψε φαγητό...")).toBeTruthy();
  });

  it("renders filter buttons", () => {
    renderFoodTab();
    expect(screen.getByText("Όλα")).toBeTruthy();
    expect(screen.getByText(/High Protein/)).toBeTruthy();
    expect(screen.getByText(/Low Carb/)).toBeTruthy();
    expect(screen.getByText(/Low Cal/)).toBeTruthy();
    expect(screen.getByText(/⚡ Keto/)).toBeTruthy();
  });

  it("renders Photo and Barcode buttons", () => {
    renderFoodTab();
    expect(screen.getByText(/Photo/)).toBeTruthy();
    expect(screen.getByText(/Barcode/)).toBeTruthy();
  });

  it("shows empty favorites message when no favorites", () => {
    renderFoodTab({ favoriteFoods: [] });
    expect(screen.getByText(/Δεν έχεις αγαπημένα ακόμα/)).toBeTruthy();
  });

  it("shows favorites when they exist", () => {
    renderFoodTab({ favoriteFoods: [sampleFood] });
    expect(screen.getByText("Feta")).toBeTruthy();
  });

  it("renders custom food form", () => {
    renderFoodTab();
    expect(screen.getByText("Custom φαγητό")).toBeTruthy();
    expect(screen.getByPlaceholderText("Όνομα")).toBeTruthy();
    expect(screen.getByPlaceholderText("kcal/100g")).toBeTruthy();
  });

  it("calls deleteEntry when delete button clicked", () => {
    const deleteEntry = vi.fn();
    renderFoodTab({
      entries: [sampleEntry],
      groupedEntries: {
        "Μεσημεριανό": { items: [sampleEntry], totalCalories: 248 },
      },
      deleteEntry,
    });
    const deleteBtn = screen.getByText("✕");
    fireEvent.click(deleteBtn);
    expect(deleteEntry).toHaveBeenCalledWith(1);
  });

  it("does not show recent section when no recent foods", () => {
    renderFoodTab({ recentFoods: [] });
    expect(screen.queryByText("Πρόσφατα")).toBeNull();
  });

  it("shows recent foods when they exist", () => {
    renderFoodTab({
      recentFoods: [{
        key: "r1",
        food: sampleFood,
        grams: 100,
        mealType: "Πρωινό",
      }],
    });
    expect(screen.getByText("Πρόσφατα")).toBeTruthy();
  });
});
