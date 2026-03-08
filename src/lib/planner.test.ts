import { describe, it, expect } from "vitest";
import { selectMealPlan, type RecipeCandidate, type PlanParams } from "./planner";

function makeCandidate(
  id: number,
  overrides: Partial<RecipeCandidate> = {}
): RecipeCandidate {
  return {
    id,
    title: `Recipe ${id}`,
    prepMinutes: null,
    ingredients: [],
    ...overrides,
  };
}

describe("selectMealPlan", () => {
  it("returns exactly mealCount recipes when pool is large enough", () => {
    const candidates = [1, 2, 3, 4, 5].map((id) => makeCandidate(id));
    const result = selectMealPlan(candidates, { mealCount: 3 });
    expect(result).toHaveLength(3);
  });

  it("returns all candidates when pool is smaller than mealCount", () => {
    const candidates = [1, 2].map((id) => makeCandidate(id));
    const result = selectMealPlan(candidates, { mealCount: 5 });
    expect(result).toHaveLength(2);
  });

  it("returns empty array when pool is empty", () => {
    const result = selectMealPlan([], { mealCount: 3 });
    expect(result).toHaveLength(0);
  });

  it("excludes recipes containing excluded ingredients", () => {
    const candidates = [
      makeCandidate(1, { ingredients: [{ name: "chicken" }] }),
      makeCandidate(2, { ingredients: [{ name: "beef" }] }),
      makeCandidate(3, { ingredients: [{ name: "tofu" }] }),
    ];
    const result = selectMealPlan(candidates, {
      mealCount: 3,
      excludeIngredients: ["chicken"],
    });
    expect(result.map((r) => r.id)).not.toContain(1);
    expect(result).toHaveLength(2);
  });

  it("excludes ingredients case-insensitively", () => {
    const candidates = [
      makeCandidate(1, { ingredients: [{ name: "Chicken" }] }),
      makeCandidate(2, { ingredients: [{ name: "beef" }] }),
    ];
    const result = selectMealPlan(candidates, {
      mealCount: 2,
      excludeIngredients: ["chicken"],
    });
    expect(result.map((r) => r.id)).not.toContain(1);
  });

  it("only includes recipes containing at least one include ingredient", () => {
    const candidates = [
      makeCandidate(1, { ingredients: [{ name: "pasta" }, { name: "tomato" }] }),
      makeCandidate(2, { ingredients: [{ name: "rice" }, { name: "chicken" }] }),
      makeCandidate(3, { ingredients: [{ name: "pasta" }, { name: "cream" }] }),
    ];
    const result = selectMealPlan(candidates, {
      mealCount: 3,
      includeIngredients: ["pasta"],
    });
    const ids = result.map((r) => r.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
    expect(ids).not.toContain(2);
  });

  it("filters out recipes exceeding maxPrepMinutes (ignores null prepMinutes)", () => {
    const candidates = [
      makeCandidate(1, { prepMinutes: 15 }),
      makeCandidate(2, { prepMinutes: 45 }),
      makeCandidate(3, { prepMinutes: null }), // unknown — keep it
    ];
    const result = selectMealPlan(candidates, {
      mealCount: 3,
      maxPrepMinutes: 30,
    });
    const ids = result.map((r) => r.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
    expect(ids).not.toContain(2);
  });

  it("is deterministic for the same input", () => {
    const candidates = [1, 2, 3, 4, 5].map((id) =>
      makeCandidate(id, { ingredients: [{ name: `ingredient-${id}` }] })
    );
    const params: PlanParams = { mealCount: 3 };
    const first = selectMealPlan(candidates, params).map((r) => r.id);
    const second = selectMealPlan(candidates, params).map((r) => r.id);
    expect(first).toEqual(second);
  });

  it("prefers recipes that share ingredients with already-selected ones", () => {
    // Recipe 1: has garlic, onion
    // Recipe 2: has garlic (shares with recipe 1)
    // Recipe 3: has completely different ingredients
    const candidates = [
      makeCandidate(1, {
        ingredients: [{ name: "garlic" }, { name: "onion" }],
      }),
      makeCandidate(2, {
        ingredients: [{ name: "garlic" }, { name: "cream" }],
      }),
      makeCandidate(3, {
        ingredients: [{ name: "banana" }, { name: "mango" }],
      }),
    ];
    // With mealCount=2, the algorithm should pick 1 and 2 (sharing garlic)
    // before picking 3 (no overlap)
    const result = selectMealPlan(candidates, { mealCount: 2 });
    const ids = result.map((r) => r.id);
    // Recipe 1 is picked first (lowest id, score 0). Then recipe 2 shares
    // garlic with recipe 1 (score=1) vs recipe 3 (score=0). So 2 is chosen.
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });

  it("returns unique recipes (no duplicates)", () => {
    const candidates = [1, 2, 3].map((id) => makeCandidate(id));
    const result = selectMealPlan(candidates, { mealCount: 3 });
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("combines include and exclude filters correctly", () => {
    const candidates = [
      makeCandidate(1, {
        ingredients: [{ name: "pasta" }, { name: "chicken" }],
      }),
      makeCandidate(2, { ingredients: [{ name: "pasta" }, { name: "tofu" }] }),
      makeCandidate(3, { ingredients: [{ name: "rice" }, { name: "tofu" }] }),
    ];
    const result = selectMealPlan(candidates, {
      mealCount: 3,
      includeIngredients: ["pasta"],
      excludeIngredients: ["chicken"],
    });
    const ids = result.map((r) => r.id);
    expect(ids).not.toContain(1); // excluded (has chicken)
    expect(ids).toContain(2); // included (has pasta, no chicken)
    expect(ids).not.toContain(3); // filtered out (no pasta)
  });
});
