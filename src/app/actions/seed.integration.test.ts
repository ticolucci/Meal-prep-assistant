import { describe, it, expect, beforeEach, vi } from "vitest";
import { testDb } from "@/db/test-client";
import { recipes, recipeIngredients } from "@/db/schema";

const FIXTURE_MEAL = {
  idMeal: "meal-001",
  strMeal: "Test Chicken Curry",
  strMealThumb: "https://example.com/curry.jpg",
  strInstructions: "Cook the chicken. Add curry paste. Serve.",
  strIngredient1: "chicken",
  strMeasure1: "500g",
  strIngredient2: "curry paste",
  strMeasure2: "2 tbsp",
  strIngredient3: "coconut milk",
  strMeasure3: "400ml",
  strIngredient4: "",
  strMeasure4: "",
};

beforeEach(async () => {
  await testDb.delete(recipeIngredients);
  await testDb.delete(recipes);
  vi.unstubAllGlobals();
});

describe("seedRecipes", () => {
  it("inserts a recipe and its ingredients into the DB", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => ({ meals: [FIXTURE_MEAL] }),
    }));

    const { seedRecipes } = await import("./seed");
    const result = await seedRecipes();

    expect(result.success).toBe(true);
    expect(result.message).toContain("Test Chicken Curry");

    const recipeRows = await testDb.select().from(recipes);
    expect(recipeRows).toHaveLength(1);
    expect(recipeRows[0].title).toBe("Test Chicken Curry");
    expect(recipeRows[0].externalId).toBe("meal-001");
    expect(recipeRows[0].source).toBe("themealdb");

    const ingredientRows = await testDb.select().from(recipeIngredients);
    expect(ingredientRows).toHaveLength(3);
    expect(ingredientRows.map((r) => r.name)).toEqual([
      "chicken",
      "curry paste",
      "coconut milk",
    ]);
  });

  it("skips insertion if the recipe already exists (deduplication)", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => ({ meals: [FIXTURE_MEAL] }),
    }));

    const { seedRecipes } = await import("./seed");
    await seedRecipes();

    // Second call with same meal
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => ({ meals: [FIXTURE_MEAL] }),
    }));

    const result = await seedRecipes();

    expect(result.success).toBe(true);
    expect(result.message).toBe("Recipe already seeded");

    const recipeRows = await testDb.select().from(recipes);
    expect(recipeRows).toHaveLength(1);
  });

  it("returns an error when the TheMealDB fetch fails", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false }));

    const { seedRecipes } = await import("./seed");
    const result = await seedRecipes();

    expect(result.success).toBe(false);
    expect(result.message).toBe("Failed to fetch from TheMealDB");

    const recipeRows = await testDb.select().from(recipes);
    expect(recipeRows).toHaveLength(0);
  });

  it("returns an error when TheMealDB returns no meals", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => ({ meals: null }),
    }));

    const { seedRecipes } = await import("./seed");
    const result = await seedRecipes();

    expect(result.success).toBe(false);
    expect(result.message).toBe("No meal returned from TheMealDB");
  });
});
