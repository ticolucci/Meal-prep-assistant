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

  it("calls Anthropic API and saves parsed recipe to DB", async () => {
    // Mock the Anthropic fetch call
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
    expect(result.recipeId).toBeDefined();

    const savedRecipes = await testDb.select().from(recipes);
    expect(savedRecipes).toHaveLength(1);
    expect(savedRecipes[0].title).toBe("Spaghetti Bolognese");
    expect(savedRecipes[0].source).toBe("ai");

    const savedIngredients = await testDb.select().from(recipeIngredients);
    expect(savedIngredients).toHaveLength(4);

    const onion = savedIngredients.find((i) => i.name === "onion");
    expect(onion?.prep).toBe("diced");
    expect(onion?.amount).toBe(1);
    expect(onion?.unit).toBe("medium");
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
