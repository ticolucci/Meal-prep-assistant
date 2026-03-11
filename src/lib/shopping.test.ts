import { describe, it, expect } from "vitest";
import {
  aggregateIngredients,
  categorizeIngredient,
  subtractPantry,
} from "./shopping";
import type { RecipeIngredient } from "@/db/schema";

// ─── Helpers ────────────────────────────────────────────────────────────────

function ing(
  partial: Partial<RecipeIngredient> & { name: string }
): RecipeIngredient {
  return {
    id: 1,
    recipeId: 1,
    measure: null,
    amount: null,
    unit: null,
    prep: null,
    ...partial,
  };
}

// ─── categorizeIngredient ────────────────────────────────────────────────────

describe("categorizeIngredient", () => {
  it("categorizes produce", () => {
    expect(categorizeIngredient("onion")).toBe("Produce");
    expect(categorizeIngredient("Garlic")).toBe("Produce");
    expect(categorizeIngredient("tomato")).toBe("Produce");
    expect(categorizeIngredient("spinach")).toBe("Produce");
    expect(categorizeIngredient("carrot")).toBe("Produce");
  });

  it("categorizes meat", () => {
    expect(categorizeIngredient("chicken breast")).toBe("Meat");
    expect(categorizeIngredient("ground beef")).toBe("Meat");
    expect(categorizeIngredient("pork chop")).toBe("Meat");
    expect(categorizeIngredient("lamb")).toBe("Meat");
    expect(categorizeIngredient("bacon")).toBe("Meat");
  });

  it("categorizes dairy", () => {
    expect(categorizeIngredient("milk")).toBe("Dairy");
    expect(categorizeIngredient("butter")).toBe("Dairy");
    expect(categorizeIngredient("cheddar cheese")).toBe("Dairy");
    expect(categorizeIngredient("heavy cream")).toBe("Dairy");
    expect(categorizeIngredient("yogurt")).toBe("Dairy");
  });

  it("categorizes seafood", () => {
    expect(categorizeIngredient("salmon")).toBe("Seafood");
    expect(categorizeIngredient("shrimp")).toBe("Seafood");
    expect(categorizeIngredient("tuna")).toBe("Seafood");
    expect(categorizeIngredient("cod")).toBe("Seafood");
  });

  it("categorizes pantry staples", () => {
    expect(categorizeIngredient("olive oil")).toBe("Pantry");
    expect(categorizeIngredient("flour")).toBe("Pantry");
    expect(categorizeIngredient("salt")).toBe("Pantry");
    expect(categorizeIngredient("sugar")).toBe("Pantry");
    expect(categorizeIngredient("rice")).toBe("Pantry");
    expect(categorizeIngredient("soy sauce")).toBe("Pantry");
  });

  it("defaults to Other for unknown ingredients", () => {
    expect(categorizeIngredient("xylitol syrup")).toBe("Other");
    expect(categorizeIngredient("")).toBe("Other");
  });
});

// ─── aggregateIngredients ────────────────────────────────────────────────────

describe("aggregateIngredients", () => {
  it("returns empty array for no ingredients", () => {
    expect(aggregateIngredients([])).toEqual([]);
  });

  it("passes through a single ingredient", () => {
    const result = aggregateIngredients([
      ing({ name: "onion", amount: 1, unit: "cup" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "onion", amount: 1, unit: "cup" });
  });

  it("sums amounts of same name and unit (case-insensitive)", () => {
    const result = aggregateIngredients([
      ing({ id: 1, recipeId: 1, name: "onion", amount: 1, unit: "cup" }),
      ing({ id: 2, recipeId: 2, name: "Onion", amount: 0.5, unit: "cup" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "onion", amount: 1.5, unit: "cup" });
  });

  it("treats null unit as its own group", () => {
    const result = aggregateIngredients([
      ing({ id: 1, recipeId: 1, name: "garlic", amount: 2, unit: null }),
      ing({ id: 2, recipeId: 2, name: "garlic", amount: 3, unit: null }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "garlic", amount: 5, unit: null });
  });

  it("keeps different units separate", () => {
    const result = aggregateIngredients([
      ing({ id: 1, recipeId: 1, name: "flour", amount: 1, unit: "cup" }),
      ing({ id: 2, recipeId: 2, name: "flour", amount: 200, unit: "g" }),
    ]);
    expect(result).toHaveLength(2);
    const names = result.map((r) => r.unit);
    expect(names).toContain("cup");
    expect(names).toContain("g");
  });

  it("handles null amounts (keeps item but amount stays null)", () => {
    const result = aggregateIngredients([
      ing({ id: 1, recipeId: 1, name: "salt", amount: null, unit: null }),
      ing({ id: 2, recipeId: 2, name: "salt", amount: null, unit: null }),
    ]);
    // Both are null-amount null-unit: same group, amount stays null
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBeNull();
  });

  it("mixes null and non-null amounts: treats null as 0 in sum, or keeps non-null", () => {
    const result = aggregateIngredients([
      ing({ id: 1, recipeId: 1, name: "pepper", amount: 1, unit: "tsp" }),
      ing({ id: 2, recipeId: 2, name: "pepper", amount: null, unit: "tsp" }),
    ]);
    // When at least one has a value, sum them (null counts as 0)
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(1);
  });

  it("assigns a category to each aggregated item", () => {
    const result = aggregateIngredients([
      ing({ name: "chicken breast", amount: 500, unit: "g" }),
      ing({ name: "olive oil", amount: 2, unit: "tbsp" }),
    ]);
    const chicken = result.find((r) => r.name === "chicken breast");
    const oil = result.find((r) => r.name === "olive oil");
    expect(chicken?.category).toBe("Meat");
    expect(oil?.category).toBe("Pantry");
  });

  it("sorts output by category, then name", () => {
    const result = aggregateIngredients([
      ing({ id: 1, recipeId: 1, name: "zucchini", amount: 1, unit: null }),
      ing({ id: 2, recipeId: 1, name: "apple", amount: 2, unit: null }),
      ing({ id: 3, recipeId: 1, name: "chicken", amount: 300, unit: "g" }),
    ]);
    const categories = result.map((r) => r.category);
    // Meat comes before Produce alphabetically
    const meatIdx = categories.indexOf("Meat");
    const produceIdx = categories.lastIndexOf("Produce");
    expect(meatIdx).toBeLessThan(produceIdx);
    // Within Produce, apple < zucchini
    const produceItems = result.filter((r) => r.category === "Produce");
    expect(produceItems[0].name).toBe("apple");
    expect(produceItems[1].name).toBe("zucchini");
  });
});

// ─── subtractPantry ──────────────────────────────────────────────────────────

describe("subtractPantry", () => {
  it("removes pantry items from aggregated list (case-insensitive)", () => {
    const aggregated = [
      { name: "onion", amount: 1, unit: "cup", category: "Produce" },
      { name: "salt", amount: null, unit: null, category: "Pantry" },
      { name: "olive oil", amount: 2, unit: "tbsp", category: "Pantry" },
    ];
    const pantry = ["Salt", "olive oil"];
    const result = subtractPantry(aggregated, pantry);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("onion");
  });

  it("returns all items when pantry is empty", () => {
    const aggregated = [
      { name: "onion", amount: 1, unit: "cup", category: "Produce" },
    ];
    expect(subtractPantry(aggregated, [])).toHaveLength(1);
  });

  it("returns empty list when all items are in pantry", () => {
    const aggregated = [
      { name: "salt", amount: null, unit: null, category: "Pantry" },
    ];
    expect(subtractPantry(aggregated, ["salt"])).toHaveLength(0);
  });
});
