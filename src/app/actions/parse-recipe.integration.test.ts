import { describe, it, expect, vi, beforeEach } from "vitest";
import { testDb } from "@/db/test-client";
import { recipes, recipeIngredients, mealPlanRecipes, mealPlans } from "@/db/schema";

// We must import AFTER vi.stubGlobal because globalSetup runs before each file
beforeEach(() => {
  vi.restoreAllMocks();
});

const MOCK_ANTHROPIC_RESPONSE = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        title: "Spaghetti Bolognese",
        prep_steps: ["Dice the onion", "Mince the garlic"],
        active_steps: ["Brown the beef", "Add tomato sauce", "Simmer for 20 min"],
        ingredients: [
          { name: "onion", prep: "diced", amount: 1, unit: "medium" },
          { name: "garlic", prep: "minced", amount: 2, unit: "cloves" },
          { name: "beef mince", prep: null, amount: 500, unit: "g" },
          { name: "tomato sauce", prep: null, amount: 400, unit: "g" },
        ],
      }),
    },
  ],
};

describe("parseRecipeText (integration)", () => {
  beforeEach(async () => {
    // Clear tables before each test (FK order: dependents first)
    await testDb.delete(mealPlanRecipes);
    await testDb.delete(mealPlans);
    await testDb.delete(recipeIngredients);
    await testDb.delete(recipes);
  });

  it("calls Anthropic API and returns parsed data WITHOUT saving to DB", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_ANTHROPIC_RESPONSE,
      })
    );

    const { parseRecipeText } = await import("./parse-recipe");
    const result = await parseRecipeText("Spaghetti Bolognese recipe text...");

    expect(result.success).toBe(true);
    expect(result.parsed).toBeDefined();
    expect(result.parsed?.title).toBe("Spaghetti Bolognese");
    expect(result.parsed?.ingredients).toHaveLength(4);
    expect(result.parsed?.prep_steps).toHaveLength(2);
    expect(result.parsed?.active_steps).toHaveLength(3);

    // Must NOT have saved to DB — DB stays empty
    expect(result.recipeId).toBeUndefined();
    const savedRecipes = await testDb.select().from(recipes);
    expect(savedRecipes).toHaveLength(0);
  });

  it("returns error when Anthropic API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Invalid API key" } }),
      })
    );

    const { parseRecipeText } = await import("./parse-recipe");
    const result = await parseRecipeText("some recipe text");

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/anthropic api|http 401/i);
  });

  it("returns error when Anthropic returns malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "not valid json {{{" }],
        }),
      })
    );

    const { parseRecipeText } = await import("./parse-recipe");
    const result = await parseRecipeText("some recipe text");

    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
  });
});

describe("saveRecipe (integration)", () => {
  beforeEach(async () => {
    await testDb.delete(mealPlanRecipes);
    await testDb.delete(mealPlans);
    await testDb.delete(recipeIngredients);
    await testDb.delete(recipes);
  });

  it("saves recipe and ingredients to DB", async () => {
    const { saveRecipe } = await import("./parse-recipe");

    const result = await saveRecipe({
      title: "Spaghetti Bolognese",
      prep_steps: ["Dice the onion", "Mince the garlic"],
      active_steps: ["Brown the beef", "Simmer for 20 min"],
      ingredients: [
        { name: "onion", prep: "diced", amount: 1, unit: "medium" },
        { name: "garlic", prep: "minced", amount: 2, unit: "cloves" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.recipeId).toBeDefined();

    const savedRecipes = await testDb.select().from(recipes);
    expect(savedRecipes).toHaveLength(1);
    expect(savedRecipes[0].title).toBe("Spaghetti Bolognese");
    expect(savedRecipes[0].source).toBe("ai");
    expect(savedRecipes[0].prepSteps).toBe(
      JSON.stringify(["Dice the onion", "Mince the garlic"])
    );
    expect(savedRecipes[0].activeSteps).toBe(
      JSON.stringify(["Brown the beef", "Simmer for 20 min"])
    );

    const savedIngredients = await testDb.select().from(recipeIngredients);
    expect(savedIngredients).toHaveLength(2);

    const onion = savedIngredients.find((i) => i.name === "onion");
    expect(onion?.prep).toBe("diced");
    expect(onion?.amount).toBe(1);
    expect(onion?.unit).toBe("medium");
  });

  it("saves recipe with empty ingredient list", async () => {
    const { saveRecipe } = await import("./parse-recipe");

    const result = await saveRecipe({
      title: "Simple Toast",
      prep_steps: [],
      active_steps: ["Toast the bread"],
      ingredients: [],
    });

    expect(result.success).toBe(true);
    const savedRecipes = await testDb.select().from(recipes);
    expect(savedRecipes).toHaveLength(1);
    const savedIngredients = await testDb.select().from(recipeIngredients);
    expect(savedIngredients).toHaveLength(0);
  });

  it("saves recipe with null ingredient amounts", async () => {
    const { saveRecipe } = await import("./parse-recipe");

    const result = await saveRecipe({
      title: "Pinch of Salt Soup",
      prep_steps: [],
      active_steps: ["Boil water"],
      ingredients: [{ name: "salt", prep: null, amount: null, unit: "" }],
    });

    expect(result.success).toBe(true);
    const savedIngredients = await testDb.select().from(recipeIngredients);
    expect(savedIngredients).toHaveLength(1);
    expect(savedIngredients[0].amount).toBeNull();
  });
});
