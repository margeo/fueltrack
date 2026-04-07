import { describe, it, expect } from "vitest";
import {
  removeAccents,
  getNutrientValue,
  parseUSDA,
  parseOFF,
  parseFatSecret,
  deduplicateFoods,
  parseBarcode,
} from "../food-parsers.js";

// ─── removeAccents ───────────────────────────────────────────

describe("removeAccents", () => {
  it("removes common Greek accents", () => {
    expect(removeAccents("φέτα")).toBe("φετα");
    expect(removeAccents("γιαούρτι")).toBe("γιαουρτι");
    expect(removeAccents("κοτόπουλο")).toBe("κοτοπουλο");
  });

  it("removes uppercase Greek accents", () => {
    expect(removeAccents("ΆΈΉΊΌΎΏ")).toBe("ΑΕΗΙΟΥΩ");
  });

  it("removes diaeresis", () => {
    expect(removeAccents("ϊ")).toBe("ι");
    expect(removeAccents("ϋ")).toBe("υ");
    expect(removeAccents("ΐ")).toBe("ι");
    expect(removeAccents("ΰ")).toBe("υ");
  });

  it("leaves unaccented text unchanged", () => {
    expect(removeAccents("chicken breast")).toBe("chicken breast");
    expect(removeAccents("αβγ")).toBe("αβγ");
  });
});

// ─── getNutrientValue ────────────────────────────────────────

describe("getNutrientValue", () => {
  it("extracts nutrient by name", () => {
    const food = {
      foodNutrients: [
        { nutrientName: "Protein", value: 25.5 },
        { nutrientName: "Energy", value: 165 },
      ],
    };
    expect(getNutrientValue(food, ["Protein"])).toBe(25.5);
    expect(getNutrientValue(food, ["Energy", "Energy (kcal)"])).toBe(165);
  });

  it("returns first match from possible names", () => {
    const food = {
      foodNutrients: [
        { nutrientName: "Energy (kcal)", value: 200 },
      ],
    };
    expect(getNutrientValue(food, ["Energy", "Energy (kcal)"])).toBe(200);
  });

  it("returns 0 when nutrient not found", () => {
    const food = {
      foodNutrients: [{ nutrientName: "Protein", value: 25 }],
    };
    expect(getNutrientValue(food, ["Fat"])).toBe(0);
  });

  it("returns 0 when foodNutrients is missing", () => {
    expect(getNutrientValue({}, ["Protein"])).toBe(0);
    expect(getNutrientValue({ foodNutrients: null }, ["Protein"])).toBe(0);
  });

  it("returns 0 when value is not a number", () => {
    const food = {
      foodNutrients: [{ nutrientName: "Protein", value: null }],
    };
    expect(getNutrientValue(food, ["Protein"])).toBe(0);
  });
});

// ─── parseUSDA ───────────────────────────────────────────────

describe("parseUSDA", () => {
  it("parses a typical USDA response", () => {
    const data = {
      foods: [
        {
          fdcId: 12345,
          description: "Chicken, breast, grilled",
          brandOwner: "ACME Foods",
          foodNutrients: [
            { nutrientName: "Energy", value: 165 },
            { nutrientName: "Protein", value: 31 },
            { nutrientName: "Carbohydrate, by difference", value: 0 },
            { nutrientName: "Total lipid (fat)", value: 3.6 },
          ],
        },
      ],
    };

    const result = parseUSDA(data);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "usda-12345",
      source: "usda",
      sourceLabel: "USDA",
      name: "Chicken, breast, grilled",
      brand: "ACME Foods",
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
    });
  });

  it("falls back to brandName when brandOwner is missing", () => {
    const data = {
      foods: [
        {
          fdcId: 1,
          description: "Food",
          brandName: "BrandB",
          foodNutrients: [],
        },
      ],
    };
    expect(parseUSDA(data)[0].brand).toBe("BrandB");
  });

  it("defaults name to 'Unknown food' when description is missing", () => {
    const data = { foods: [{ fdcId: 1, foodNutrients: [] }] };
    expect(parseUSDA(data)[0].name).toBe("Unknown food");
  });

  it("returns empty array for null/undefined data", () => {
    expect(parseUSDA(null)).toEqual([]);
    expect(parseUSDA(undefined)).toEqual([]);
    expect(parseUSDA({})).toEqual([]);
  });

  it("returns empty array when foods array is empty", () => {
    expect(parseUSDA({ foods: [] })).toEqual([]);
  });

  it("handles multiple foods", () => {
    const data = {
      foods: [
        { fdcId: 1, description: "A", foodNutrients: [] },
        { fdcId: 2, description: "B", foodNutrients: [] },
      ],
    };
    expect(parseUSDA(data)).toHaveLength(2);
  });
});

// ─── parseOFF ────────────────────────────────────────────────

describe("parseOFF", () => {
  it("parses Open Food Facts products", () => {
    const data = {
      products: [
        {
          code: "5001234567890",
          product_name: "Feta Cheese",
          product_name_el: "Φέτα",
          brands: "Dodoni",
          nutriments: {
            "energy-kcal_100g": 264,
            proteins_100g: 17,
            carbohydrates_100g: 1.5,
            fat_100g: 21,
          },
        },
      ],
    };

    const result = parseOFF(data, "🇬🇷 Greek");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "off-5001234567890",
      source: "off",
      sourceLabel: "🇬🇷 Greek",
      name: "Φέτα",
      brand: "Dodoni",
      caloriesPer100g: 264,
      proteinPer100g: 17,
      carbsPer100g: 1.5,
      fatPer100g: 21,
    });
  });

  it("prefers Greek product name over default", () => {
    const data = {
      products: [
        {
          code: "1",
          product_name: "Feta",
          product_name_el: "Φέτα",
          nutriments: { "energy-kcal_100g": 264 },
        },
      ],
    };
    expect(parseOFF(data, "test")[0].name).toBe("Φέτα");
  });

  it("falls back to product_name when Greek name missing", () => {
    const data = {
      products: [
        {
          code: "1",
          product_name: "Feta",
          nutriments: { "energy-kcal_100g": 264 },
        },
      ],
    };
    expect(parseOFF(data, "test")[0].name).toBe("Feta");
  });

  it("filters products with no name", () => {
    const data = {
      products: [
        { code: "1", nutriments: { "energy-kcal_100g": 100 } },
      ],
    };
    expect(parseOFF(data, "test")).toEqual([]);
  });

  it("filters products with 0 calories", () => {
    const data = {
      products: [
        {
          code: "1",
          product_name: "Water",
          nutriments: { "energy-kcal_100g": 0 },
        },
      ],
    };
    expect(parseOFF(data, "test")).toEqual([]);
  });

  it("returns empty array for null/missing data", () => {
    expect(parseOFF(null, "test")).toEqual([]);
    expect(parseOFF({}, "test")).toEqual([]);
    expect(parseOFF({ products: null }, "test")).toEqual([]);
  });

  it("handles missing nutriment fields gracefully", () => {
    const data = {
      products: [
        {
          code: "1",
          product_name: "Test",
          nutriments: { "energy-kcal_100g": 100 },
        },
      ],
    };
    const result = parseOFF(data, "test");
    expect(result[0].proteinPer100g).toBe(0);
    expect(result[0].carbsPer100g).toBe(0);
    expect(result[0].fatPer100g).toBe(0);
  });
});

// ─── parseFatSecret ──────────────────────────────────────────

describe("parseFatSecret", () => {
  it("parses standard FatSecret description format", () => {
    const data = {
      foods: {
        food: [
          {
            food_id: "42",
            food_name: "Chicken Breast",
            brand_name: "Generic",
            food_description:
              "Per 100g - Calories: 165kcal | Fat: 3.6g | Carbs: 0g | Protein: 31g",
          },
        ],
      },
    };

    const result = parseFatSecret(data);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "fs-42",
      source: "fatsecret",
      sourceLabel: "FatSecret",
      name: "Chicken Breast",
      brand: "Generic",
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
    });
  });

  it("handles single food object (not array)", () => {
    const data = {
      foods: {
        food: {
          food_id: "1",
          food_name: "Rice",
          food_description: "Per 100g - Calories: 130kcal | Fat: 0.3g | Carbs: 28g | Protein: 2.7g",
        },
      },
    };

    const result = parseFatSecret(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Rice");
  });

  it("handles decimal values in description", () => {
    const data = {
      foods: {
        food: [
          {
            food_id: "1",
            food_name: "Olive Oil",
            food_description: "Per 100ml - Calories: 884.5kcal | Fat: 100.0g | Carbs: 0.0g | Protein: 0.0g",
          },
        ],
      },
    };

    const result = parseFatSecret(data);
    expect(result[0].caloriesPer100g).toBe(884.5);
    expect(result[0].fatPer100g).toBe(100.0);
  });

  it("handles case-insensitive matching", () => {
    const data = {
      foods: {
        food: [
          {
            food_id: "1",
            food_name: "Test",
            food_description: "calories: 200KCAL | fat: 10G | carbs: 20G | protein: 15G",
          },
        ],
      },
    };

    const result = parseFatSecret(data);
    expect(result[0].caloriesPer100g).toBe(200);
    expect(result[0].fatPer100g).toBe(10);
  });

  it("returns 0 for values not matching regex", () => {
    const data = {
      foods: {
        food: [
          {
            food_id: "1",
            food_name: "Mystery Food",
            food_description: "Calories: 100kcal",
          },
        ],
      },
    };

    const result = parseFatSecret(data);
    expect(result[0].caloriesPer100g).toBe(100);
    expect(result[0].proteinPer100g).toBe(0);
    expect(result[0].carbsPer100g).toBe(0);
    expect(result[0].fatPer100g).toBe(0);
  });

  it("filters out foods with 0 calories (no calorie match)", () => {
    const data = {
      foods: {
        food: [
          {
            food_id: "1",
            food_name: "Empty Food",
            food_description: "No nutritional info available",
          },
        ],
      },
    };

    expect(parseFatSecret(data)).toEqual([]);
  });

  it("filters out foods without food_name", () => {
    const data = {
      foods: {
        food: [
          {
            food_id: "1",
            food_description: "Calories: 100kcal",
          },
        ],
      },
    };

    expect(parseFatSecret(data)).toEqual([]);
  });

  it("defaults brand to empty string when missing", () => {
    const data = {
      foods: {
        food: [
          {
            food_id: "1",
            food_name: "Test",
            food_description: "Calories: 100kcal | Fat: 5g | Carbs: 10g | Protein: 8g",
          },
        ],
      },
    };

    expect(parseFatSecret(data)[0].brand).toBe("");
  });

  it("returns empty array for null/missing data", () => {
    expect(parseFatSecret(null)).toEqual([]);
    expect(parseFatSecret({})).toEqual([]);
    expect(parseFatSecret({ foods: {} })).toEqual([]);
    expect(parseFatSecret({ foods: { food: null } })).toEqual([]);
  });

  it("handles empty description string", () => {
    const data = {
      foods: {
        food: [
          { food_id: "1", food_name: "Test", food_description: "" },
        ],
      },
    };
    // No calorie match → filtered out
    expect(parseFatSecret(data)).toEqual([]);
  });

  it("handles description with extra whitespace", () => {
    const data = {
      foods: {
        food: [
          {
            food_id: "1",
            food_name: "Test",
            food_description: "Calories:  200kcal | Fat:  10g | Carbs:  5g | Protein:  15g",
          },
        ],
      },
    };
    const result = parseFatSecret(data);
    expect(result[0].caloriesPer100g).toBe(200);
    expect(result[0].fatPer100g).toBe(10);
  });
});

// ─── deduplicateFoods ────────────────────────────────────────

describe("deduplicateFoods", () => {
  it("removes duplicates by name|brand key", () => {
    const fs = [{ name: "Feta", brand: "Dodoni", source: "fatsecret" }];
    const off = [{ name: "Feta", brand: "Dodoni", source: "off" }];
    const usda = [{ name: "Feta", brand: "Dodoni", source: "usda" }];

    const result = deduplicateFoods(fs, off, usda);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("fatsecret"); // FatSecret has priority
  });

  it("is case-insensitive", () => {
    const fs = [{ name: "FETA", brand: "DODONI", source: "fatsecret" }];
    const off = [{ name: "feta", brand: "dodoni", source: "off" }];

    const result = deduplicateFoods(fs, off, []);
    expect(result).toHaveLength(1);
  });

  it("trims whitespace in comparison", () => {
    const fs = [{ name: "Feta ", brand: " Dodoni", source: "fatsecret" }];
    const off = [{ name: "Feta", brand: "Dodoni", source: "off" }];

    const result = deduplicateFoods(fs, off, []);
    expect(result).toHaveLength(1);
  });

  it("keeps foods with different names", () => {
    const fs = [{ name: "Feta", brand: "", source: "fatsecret" }];
    const off = [{ name: "Chicken", brand: "", source: "off" }];
    const usda = [{ name: "Rice", brand: "", source: "usda" }];

    const result = deduplicateFoods(fs, off, usda);
    expect(result).toHaveLength(3);
  });

  it("keeps foods with same name but different brand", () => {
    const fs = [{ name: "Feta", brand: "Dodoni", source: "fatsecret" }];
    const off = [{ name: "Feta", brand: "Kolios", source: "off" }];

    const result = deduplicateFoods(fs, off, []);
    expect(result).toHaveLength(2);
  });

  it("prioritizes FatSecret over OFF over USDA", () => {
    const fs = [{ name: "X", brand: "", source: "fatsecret", caloriesPer100g: 100 }];
    const off = [{ name: "X", brand: "", source: "off", caloriesPer100g: 200 }];
    const usda = [{ name: "X", brand: "", source: "usda", caloriesPer100g: 300 }];

    const result = deduplicateFoods(fs, off, usda);
    expect(result).toHaveLength(1);
    expect(result[0].caloriesPer100g).toBe(100);
  });

  it("handles empty arrays", () => {
    expect(deduplicateFoods([], [], [])).toEqual([]);
  });

  it("handles null/undefined name or brand", () => {
    const foods = [
      { name: null, brand: null, source: "a" },
      { name: undefined, brand: undefined, source: "b" },
    ];
    // Both resolve to "|" key → first one wins
    const result = deduplicateFoods(foods, [], []);
    expect(result).toHaveLength(1);
  });
});

// ─── parseBarcode ────────────────────────────────────────────

describe("parseBarcode", () => {
  it("parses a valid barcode response", () => {
    const data = {
      status: 1,
      product: {
        product_name: "Feta Cheese",
        product_name_el: "Φέτα Τυρί",
        brands: "Dodoni",
        nutriments: {
          "energy-kcal_100g": 264,
          proteins_100g: 17,
          carbohydrates_100g: 1.5,
          fat_100g: 21,
        },
        image_front_small_url: "https://example.com/feta.jpg",
      },
    };

    const result = parseBarcode(data, "5001234567890");
    expect(result).toEqual({
      found: true,
      id: "off-5001234567890",
      source: "off",
      sourceLabel: "OpenFood",
      name: "Φέτα Τυρί",
      brand: "Dodoni",
      caloriesPer100g: 264,
      proteinPer100g: 17,
      carbsPer100g: 1.5,
      fatPer100g: 21,
      image: "https://example.com/feta.jpg",
    });
  });

  it("returns found:false when product not found", () => {
    expect(parseBarcode({ status: 0 }, "123")).toEqual({ found: false });
    expect(parseBarcode({ status: 1, product: null }, "123")).toEqual({ found: false });
  });

  it("prefers Greek product name", () => {
    const data = {
      status: 1,
      product: {
        product_name: "English Name",
        product_name_el: "Ελληνικό Όνομα",
        nutriments: {},
      },
    };
    expect(parseBarcode(data, "1").name).toBe("Ελληνικό Όνομα");
  });

  it("falls back to default name when Greek missing", () => {
    const data = {
      status: 1,
      product: {
        product_name: "English Name",
        nutriments: {},
      },
    };
    expect(parseBarcode(data, "1").name).toBe("English Name");
  });

  it("defaults to 'Unknown' when no name exists", () => {
    const data = {
      status: 1,
      product: { nutriments: {} },
    };
    expect(parseBarcode(data, "1").name).toBe("Unknown");
  });

  it("handles missing nutriments", () => {
    const data = {
      status: 1,
      product: { product_name: "Test" },
    };
    const result = parseBarcode(data, "1");
    expect(result.caloriesPer100g).toBe(0);
    expect(result.proteinPer100g).toBe(0);
    expect(result.carbsPer100g).toBe(0);
    expect(result.fatPer100g).toBe(0);
  });

  it("defaults image to empty string when missing", () => {
    const data = {
      status: 1,
      product: { product_name: "Test", nutriments: {} },
    };
    expect(parseBarcode(data, "1").image).toBe("");
  });
});
