import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

// Suppress console.error from React and our componentDidCatch during tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function BrokenChild() {
  throw new Error("Test explosion");
}

function GoodChild() {
  return <div>All good</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeTruthy();
  });

  it("renders fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("Κάτι πήγε στραβά")).toBeTruthy();
    expect(screen.getByText("Δοκίμασε ξανά")).toBeTruthy();
  });

  it("shows component name in error message", () => {
    render(
      <ErrorBoundary name="Φαγητό">
        <BrokenChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("Σφάλμα στο Φαγητό")).toBeTruthy();
  });

  it("shows generic message when no name prop", () => {
    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("Παρουσιάστηκε σφάλμα")).toBeTruthy();
  });

  it("recovers when retry button is clicked", () => {
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) throw new Error("Boom");
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Κάτι πήγε στραβά")).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Δοκίμασε ξανά"));

    expect(screen.getByText("Recovered")).toBeTruthy();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <BrokenChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error")).toBeTruthy();
  });

  it("logs error to console", () => {
    render(
      <ErrorBoundary name="TestSection">
        <BrokenChild />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
  });

  it("does not affect sibling components", () => {
    render(
      <div>
        <ErrorBoundary name="Broken">
          <BrokenChild />
        </ErrorBoundary>
        <ErrorBoundary name="Working">
          <GoodChild />
        </ErrorBoundary>
      </div>
    );
    expect(screen.getByText("Κάτι πήγε στραβά")).toBeTruthy();
    expect(screen.getByText("All good")).toBeTruthy();
  });
});
