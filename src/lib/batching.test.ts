import { describe, it, expect } from "vitest";
import { batchPrepTasks } from "./batching";
import type { MenuEntry } from "./batching";
import type { RecipeIngredient } from "@/db/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function menu(
  entries: Array<{ recipeId: number; title: string; ingredients: RecipeIngredient[] }>
): MenuEntry[] {
  return entries;
}

// ─── batchPrepTasks ──────────────────────────────────────────────────────────

describe("batchPrepTasks", () => {
  it("returns empty array for an empty menu", () => {
    expect(batchPrepTasks([])).toEqual([]);
  });

  it("returns empty array when no ingredients have a prep value", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "chicken", prep: null }),
          ing({ id: 2, recipeId: 1, name: "salt", prep: null }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 3, recipeId: 2, name: "chicken", prep: null }),
        ],
      },
    ]);
    expect(batchPrepTasks(m)).toEqual([]);
  });

  it("returns empty array when the same ingredient with prep appears in only one recipe", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "onion", prep: "diced" }),
        ],
      },
    ]);
    expect(batchPrepTasks(m)).toEqual([]);
  });

  it("batches an ingredient with the same prep across two recipes", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "onion", prep: "diced", amount: 1, unit: "cup" }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 2, recipeId: 2, name: "Onion", prep: "Diced", amount: 0.5, unit: "cup" }),
        ],
      },
    ]);
    const result = batchPrepTasks(m);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "onion",
      prep: "diced",
      totalAmount: 1.5,
      unit: "cup",
      unitMismatch: false,
      recipeCount: 2,
    });
  });

  it("does NOT batch the same ingredient with different prep states", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "onion", prep: "diced", amount: 1, unit: "cup" }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 2, recipeId: 2, name: "onion", prep: "sliced", amount: 0.5, unit: "cup" }),
        ],
      },
    ]);
    // "diced" and "sliced" are different prep states → different groups → no group has 2+ recipes → empty
    expect(batchPrepTasks(m)).toEqual([]);
  });

  it("handles null amounts (sums non-null, totalAmount stays null if all null)", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "garlic", prep: "minced", amount: null, unit: null }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 2, recipeId: 2, name: "garlic", prep: "minced", amount: null, unit: null }),
        ],
      },
    ]);
    const result = batchPrepTasks(m);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "garlic",
      prep: "minced",
      totalAmount: null,
      unit: null,
      unitMismatch: false,
      recipeCount: 2,
    });
  });

  it("mixes null and non-null amounts (null treated as 0)", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "garlic", prep: "minced", amount: 3, unit: "clove" }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 2, recipeId: 2, name: "garlic", prep: "minced", amount: null, unit: "clove" }),
        ],
      },
    ]);
    const result = batchPrepTasks(m);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe(3);
  });

  it("flags unitMismatch when the same ingredient has different units", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "flour", prep: "sifted", amount: 1, unit: "cup" }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 2, recipeId: 2, name: "flour", prep: "sifted", amount: 200, unit: "g" }),
        ],
      },
    ]);
    const result = batchPrepTasks(m);
    expect(result).toHaveLength(1);
    expect(result[0].unitMismatch).toBe(true);
    expect(result[0].totalAmount).toBeNull(); // can't sum across different units
  });

  it("sets prepSafe=true for known prep-ahead-safe ingredients", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "onion", prep: "diced", amount: 1, unit: "cup" }),
          ing({ id: 2, recipeId: 1, name: "garlic", prep: "minced", amount: 3, unit: "clove" }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 3, recipeId: 2, name: "onion", prep: "diced", amount: 1, unit: "cup" }),
          ing({ id: 4, recipeId: 2, name: "garlic", prep: "minced", amount: 2, unit: "clove" }),
        ],
      },
    ]);
    const result = batchPrepTasks(m);
    const onionTask = result.find((t) => t.name === "onion");
    const garlicTask = result.find((t) => t.name === "garlic");
    expect(onionTask?.prepSafe).toBe(true);
    expect(garlicTask?.prepSafe).toBe(true);
  });

  it("sets prepSafe=false for ingredients NOT on the safe list", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "avocado", prep: "sliced", amount: 1, unit: null }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 2, recipeId: 2, name: "avocado", prep: "sliced", amount: 1, unit: null }),
        ],
      },
    ]);
    const result = batchPrepTasks(m);
    expect(result[0].prepSafe).toBe(false);
  });

  it("batches across 3+ recipes correctly", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [ing({ id: 1, recipeId: 1, name: "carrot", prep: "diced", amount: 1, unit: "cup" })],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [ing({ id: 2, recipeId: 2, name: "carrot", prep: "diced", amount: 1, unit: "cup" })],
      },
      {
        recipeId: 3,
        title: "Recipe C",
        ingredients: [ing({ id: 3, recipeId: 3, name: "carrot", prep: "diced", amount: 2, unit: "cup" })],
      },
    ]);
    const result = batchPrepTasks(m);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "carrot",
      prep: "diced",
      totalAmount: 4,
      unit: "cup",
      recipeCount: 3,
    });
  });

  it("returns recipeIds for all matched recipes", () => {
    const m = menu([
      {
        recipeId: 10,
        title: "Recipe A",
        ingredients: [ing({ id: 1, recipeId: 10, name: "onion", prep: "diced", amount: 1, unit: "cup" })],
      },
      {
        recipeId: 20,
        title: "Recipe B",
        ingredients: [ing({ id: 2, recipeId: 20, name: "onion", prep: "diced", amount: 1, unit: "cup" })],
      },
    ]);
    const result = batchPrepTasks(m);
    expect(result[0].recipeIds).toEqual(expect.arrayContaining([10, 20]));
    expect(result[0].recipeIds).toHaveLength(2);
  });

  it("sorts output: prepSafe=true first, then by recipeCount descending, then name", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "avocado", prep: "sliced", amount: 1, unit: null }),
          ing({ id: 2, recipeId: 1, name: "onion", prep: "diced", amount: 1, unit: "cup" }),
          ing({ id: 3, recipeId: 1, name: "carrot", prep: "diced", amount: 1, unit: "cup" }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 4, recipeId: 2, name: "avocado", prep: "sliced", amount: 1, unit: null }),
          ing({ id: 5, recipeId: 2, name: "onion", prep: "diced", amount: 1, unit: "cup" }),
          ing({ id: 6, recipeId: 2, name: "carrot", prep: "diced", amount: 1, unit: "cup" }),
        ],
      },
      {
        recipeId: 3,
        title: "Recipe C",
        ingredients: [
          ing({ id: 7, recipeId: 3, name: "onion", prep: "diced", amount: 1, unit: "cup" }),
        ],
      },
    ]);
    const result = batchPrepTasks(m);
    // onion appears in 3 recipes (prepSafe), carrot in 2 (prepSafe), avocado in 2 (not safe)
    // Expected order: onion (safe, count=3), carrot (safe, count=2), avocado (unsafe, count=2)
    expect(result[0].name).toBe("onion");
    expect(result[1].name).toBe("carrot");
    expect(result[2].name).toBe("avocado");
  });

  it("ignores ingredients with empty string prep", () => {
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [ing({ id: 1, recipeId: 1, name: "salt", prep: "" })],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [ing({ id: 2, recipeId: 2, name: "salt", prep: "" })],
      },
    ]);
    expect(batchPrepTasks(m)).toEqual([]);
  });

  it("treats ingredients from the same recipe with same name+prep as one unit (no self-batching)", () => {
    // If a recipe lists the same ingredient twice with same prep (edge case),
    // it still only counts as one recipe contributing to the batch.
    const m = menu([
      {
        recipeId: 1,
        title: "Recipe A",
        ingredients: [
          ing({ id: 1, recipeId: 1, name: "onion", prep: "diced", amount: 0.5, unit: "cup" }),
          ing({ id: 2, recipeId: 1, name: "onion", prep: "diced", amount: 0.5, unit: "cup" }),
        ],
      },
      {
        recipeId: 2,
        title: "Recipe B",
        ingredients: [
          ing({ id: 3, recipeId: 2, name: "onion", prep: "diced", amount: 1, unit: "cup" }),
        ],
      },
    ]);
    const result = batchPrepTasks(m);
    // recipeCount should be 2 (two distinct recipes), not 3
    expect(result).toHaveLength(1);
    expect(result[0].recipeCount).toBe(2);
    // totalAmount sums all instances: 0.5 + 0.5 + 1 = 2
    expect(result[0].totalAmount).toBe(2);
  });
});
