import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WelcomeScreen from "../WelcomeScreen";

describe("WelcomeScreen", () => {
  it("renders the main heading", () => {
    render(<WelcomeScreen onStart={vi.fn()} />);
    expect(screen.getByText(/Καταγραφή → Πλάνο → Αποτέλεσμα/)).toBeTruthy();
  });

  it("renders all 4 feature cards", () => {
    render(<WelcomeScreen onStart={vi.fn()} />);
    expect(screen.getByText("Goal-first προσέγγιση")).toBeTruthy();
    expect(screen.getByText("AI Coach που σε ξέρει")).toBeTruthy();
    expect(screen.getByText("Ελληνικά φαγητά & μερίδες")).toBeTruthy();
    expect(screen.getByText("Γρήγορο & απλό")).toBeTruthy();
  });

  it("renders the formula card", () => {
    render(<WelcomeScreen onStart={vi.fn()} />);
    expect(screen.getByText(/Υπόλοιπο = Στόχος − Φαγητό \+ Άσκηση/)).toBeTruthy();
  });

  it("renders the start button", () => {
    render(<WelcomeScreen onStart={vi.fn()} />);
    expect(screen.getByText("Ξεκίνα →")).toBeTruthy();
  });

  it("calls onStart when start button clicked", () => {
    const onStart = vi.fn();
    render(<WelcomeScreen onStart={onStart} />);
    fireEvent.click(screen.getByText("Ξεκίνα →"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
