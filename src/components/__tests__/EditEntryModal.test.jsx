import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EditEntryModal from "../EditEntryModal";

// Sample entry with base per-100g values
const sampleEntry = {
  id: 1,
  name: "Chicken Breast",
  brand: "Generic",
  grams: 150,
  calories: 248,
  protein: 46.5,
  carbs: 0,
  fat: 5.4,
  baseCaloriesPer100g: 165,
  baseProteinPer100g: 31,
  baseCarbsPer100g: 0,
  baseFatPer100g: 3.6,
  mealType: "Μεσημεριανό",
};

function renderModal(overrides = {}) {
  const props = {
    entry: sampleEntry,
    grams: "150",
    setGrams: vi.fn(),
    meal: "Μεσημεριανό",
    setMeal: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  };
  const result = render(<EditEntryModal {...props} />);
  return { ...result, props };
}

describe("EditEntryModal", () => {
  it("renders entry name and brand", () => {
    renderModal();
    expect(screen.getByText(/Chicken Breast/)).toBeTruthy();
    expect(screen.getByText(/Generic/)).toBeTruthy();
  });

  it("renders grams input with current value", () => {
    renderModal({ grams: "200" });
    const input = screen.getByDisplayValue("200");
    expect(input).toBeTruthy();
  });

  it("renders meal type selector", () => {
    renderModal();
    const select = screen.getByDisplayValue("Μεσημεριανό");
    expect(select).toBeTruthy();
  });

  it("shows all 4 meal options", () => {
    renderModal();
    expect(screen.getByText("Πρωινό")).toBeTruthy();
    expect(screen.getByText("Μεσημεριανό")).toBeTruthy();
    expect(screen.getByText("Βραδινό")).toBeTruthy();
    expect(screen.getByText("Σνακ")).toBeTruthy();
  });

  it("calls setGrams when input changes", () => {
    const { props } = renderModal();
    const input = screen.getByDisplayValue("150");
    fireEvent.change(input, { target: { value: "200" } });
    expect(props.setGrams).toHaveBeenCalledWith("200");
  });

  it("calls setMeal when meal selection changes", () => {
    const { props } = renderModal();
    const select = screen.getByDisplayValue("Μεσημεριανό");
    fireEvent.change(select, { target: { value: "Βραδινό" } });
    expect(props.setMeal).toHaveBeenCalledWith("Βραδινό");
  });

  it("calls onSave when save button clicked", () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByText("Αποθήκευση"));
    expect(props.onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button clicked", () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByText("Άκυρο"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay clicked", () => {
    const { props } = renderModal();
    fireEvent.click(document.querySelector(".modal-overlay"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when modal sheet clicked", () => {
    const { props } = renderModal();
    fireEvent.click(document.querySelector(".modal-sheet"));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("recalculates preview when grams change", () => {
    // 200g of chicken: 165 * 2 = 330 cal
    renderModal({ grams: "200" });
    expect(screen.getByText("330")).toBeTruthy();
  });

  it("shows correct macros for 100g", () => {
    renderModal({ grams: "100" });
    // 100g: 165 cal, 31g protein, 0 carbs, 3.6g fat
    expect(screen.getByText("165")).toBeTruthy();
  });

  it("handles entry without brand gracefully", () => {
    const entryNoBrand = { ...sampleEntry, brand: "" };
    renderModal({ entry: entryNoBrand });
    // Should not show " · " separator
    const nameDiv = screen.getByText("Chicken Breast");
    expect(nameDiv.textContent).not.toContain("·");
  });
});
