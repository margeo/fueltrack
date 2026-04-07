import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import useFoodSearch from "../useFoodSearch";

// Mock the foodCache module
vi.mock("../../utils/foodCache", () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
}));

import { getCached, setCache } from "../../utils/foodCache";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createFetchResponse(data) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  getCached.mockReset().mockResolvedValue(null);
  setCache.mockReset().mockResolvedValue(undefined);
});

describe("useFoodSearch", () => {
  it("returns empty results for empty query", () => {
    const { result } = renderHook(() => useFoodSearch(""));
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("returns empty results for single character query", () => {
    const { result } = renderHook(() => useFoodSearch("a"));
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("returns empty results for whitespace-only query", () => {
    const { result } = renderHook(() => useFoodSearch("   "));
    expect(result.current.results).toEqual([]);
  });

  it("fetches results for valid query after debounce", async () => {
    const foods = [{ name: "Chicken", brand: "", caloriesPer100g: 165 }];
    mockFetch.mockImplementation(() => createFetchResponse(foods));

    const { result } = renderHook(() => useFoodSearch("chicken"));

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    expect(mockFetch).toHaveBeenCalled();
  });

  it("returns cached results without calling API", async () => {
    const cachedFoods = [
      { name: "Feta", brand: "Dodoni", caloriesPer100g: 264 },
    ];
    getCached.mockResolvedValue(cachedFoods);

    const { result } = renderHook(() => useFoodSearch("feta"));

    await waitFor(() => {
      expect(result.current.results).toEqual(cachedFoods);
    }, { timeout: 2000 });

    // Should not call fetch when cache hit
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls setCache after successful API fetch", async () => {
    const apiFoods = [{ name: "Rice", brand: "", caloriesPer100g: 130 }];
    mockFetch.mockImplementation(() => createFetchResponse(apiFoods));

    const { result } = renderHook(() => useFoodSearch("rice"));

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    }, { timeout: 2000 });

    expect(setCache).toHaveBeenCalled();
  });

  it("deduplicates results from multiple API calls", async () => {
    const foods = [{ name: "Chicken", brand: "", caloriesPer100g: 165 }];
    mockFetch.mockImplementation(() => createFetchResponse(foods));

    const { result } = renderHook(() => useFoodSearch("chicken"));

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // Even though multiple API calls return same food, should be deduped
    expect(result.current.results.length).toBeLessThanOrEqual(1);
  });

  it("sets loading to false after results arrive", async () => {
    mockFetch.mockImplementation(() => createFetchResponse([]));

    const { result } = renderHook(() => useFoodSearch("test food"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 2000 });
  });

  it("handles API errors gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useFoodSearch("error test"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.results).toEqual([]);
  });

  it("does not cache empty results", async () => {
    mockFetch.mockImplementation(() => createFetchResponse([]));

    renderHook(() => useFoodSearch("nothing here"));

    // Wait for the debounce + API call to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Give a tick for the cache logic to execute
    await new Promise((r) => setTimeout(r, 50));

    expect(setCache).not.toHaveBeenCalled();
  });

  it("resets results when query becomes too short", async () => {
    const foods = [{ name: "Chicken", brand: "", caloriesPer100g: 165 }];
    mockFetch.mockImplementation(() => createFetchResponse(foods));

    const { result, rerender } = renderHook(
      ({ q }) => useFoodSearch(q),
      { initialProps: { q: "chicken" } }
    );

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    }, { timeout: 2000 });

    // Shorten query to 1 char
    rerender({ q: "c" });

    await waitFor(() => {
      expect(result.current.results).toEqual([]);
    });
  });
});
