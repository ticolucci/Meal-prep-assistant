import { describe, it, expect, beforeEach } from "vitest";
import { testDb } from "@/db/test-client";
import {
  recipes,
  recipeIngredients,
  mealPlans,
  mealPlanRecipes,
  pantryItems,
  shoppingListExtra,
} from "@/db/schema";
import { makeRecipe, makeIngredient } from "@/test/factories";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function makeApprovedPlan(recipeIds: number[]) {
  const [plan] = await testDb
    .insert(mealPlans)
    .values({ status: "approved", mealCount: recipeIds.length, params: "{}" })
    .returning();
  if (recipeIds.length > 0) {
    await testDb.insert(mealPlanRecipes).values(
      recipeIds.map((id, idx) => ({
        planId: plan.id,
        recipeId: id,
        position: idx,
      }))
    );
  }
  return plan;
}

// ─── Table cleanup ───────────────────────────────────────────────────────────

beforeEach(async () => {
  await testDb.delete(shoppingListExtra);
  await testDb.delete(pantryItems);
  await testDb.delete(mealPlanRecipes);
  await testDb.delete(mealPlans);
  await testDb.delete(recipeIngredients);
  await testDb.delete(recipes);
});

// ─── getShoppingList ─────────────────────────────────────────────────────────

describe("getShoppingList", () => {
  it("returns null planId and empty items when no approved plan exists", async () => {
    const { getShoppingList } = await import("./shopping");
    const result = await getShoppingList();
    expect(result.planId).toBeNull();
    expect(result.items).toHaveLength(0);
  });

  it("aggregates ingredients from all recipes in the approved plan", async () => {
    const r1 = await makeRecipe({ title: "Pasta" });
    await makeIngredient({ recipeId: r1.id, name: "pasta", amount: 200, unit: "g" });
    await makeIngredient({ recipeId: r1.id, name: "onion", amount: 1, unit: "cup" });

    const r2 = await makeRecipe({ title: "Salad" });
    await makeIngredient({ recipeId: r2.id, name: "onion", amount: 0.5, unit: "cup" });
    await makeIngredient({ recipeId: r2.id, name: "tomato", amount: 2, unit: null });

    await makeApprovedPlan([r1.id, r2.id]);

    const { getShoppingList } = await import("./shopping");
    const result = await getShoppingList();

    expect(result.planId).not.toBeNull();
    // onion should be aggregated: 1 + 0.5 = 1.5 cups
    const onion = result.items.find((i) => i.name === "onion");
    expect(onion).toBeDefined();
    expect(onion!.amount).toBeCloseTo(1.5);
    expect(onion!.unit).toBe("cup");
  });

  it("subtracts pantry items from the aggregated list", async () => {
    const r = await makeRecipe({ title: "Soup" });
    await makeIngredient({ recipeId: r.id, name: "salt", amount: null, unit: null });
    await makeIngredient({ recipeId: r.id, name: "carrot", amount: 2, unit: null });

    await makeApprovedPlan([r.id]);

    // Mark salt as pantry item
    await testDb.insert(pantryItems).values({ name: "salt" });

    const { getShoppingList } = await import("./shopping");
    const result = await getShoppingList();

    const names = result.items.map((i) => i.name);
    expect(names).not.toContain("salt");
    expect(names).toContain("carrot");
  });

  it("includes ad-hoc items in the result", async () => {
    await makeApprovedPlan([]);
    await testDb.insert(shoppingListExtra).values({ name: "sparkling water", checked: 0 });

    const { getShoppingList } = await import("./shopping");
    const result = await getShoppingList();

    expect(result.adHocItems).toHaveLength(1);
    expect(result.adHocItems[0].name).toBe("sparkling water");
  });

  it("uses the most recently created approved plan when multiple exist", async () => {
    const r1 = await makeRecipe({ title: "Old Recipe" });
    await makeIngredient({ recipeId: r1.id, name: "pasta", amount: 100, unit: "g" });

    const r2 = await makeRecipe({ title: "New Recipe" });
    await makeIngredient({ recipeId: r2.id, name: "rice", amount: 200, unit: "g" });

    // Create older plan first
    await makeApprovedPlan([r1.id]);
    // Create newer plan second
    await makeApprovedPlan([r2.id]);

    const { getShoppingList } = await import("./shopping");
    const result = await getShoppingList();

    const names = result.items.map((i) => i.name);
    // Should only contain rice (from newest plan), not pasta
    expect(names).toContain("rice");
    expect(names).not.toContain("pasta");
  });
});

// ─── addPantryItem / removePantryItem ────────────────────────────────────────

describe("addPantryItem", () => {
  it("inserts a pantry item into the DB", async () => {
    const { addPantryItem } = await import("./shopping");
    await addPantryItem("olive oil");

    const rows = await testDb.select().from(pantryItems);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("olive oil");
  });

  it("does not insert a duplicate pantry item", async () => {
    const { addPantryItem } = await import("./shopping");
    await addPantryItem("salt");
    await addPantryItem("salt"); // second call should be a no-op

    const rows = await testDb.select().from(pantryItems);
    expect(rows).toHaveLength(1);
  });
});

describe("removePantryItem", () => {
  it("deletes the pantry item by id", async () => {
    const [item] = await testDb
      .insert(pantryItems)
      .values({ name: "flour" })
      .returning();

    const { removePantryItem } = await import("./shopping");
    await removePantryItem(item.id);

    const rows = await testDb.select().from(pantryItems);
    expect(rows).toHaveLength(0);
  });
});

// ─── addAdHocItem / toggleAdHocItem / removeAdHocItem ───────────────────────

describe("addAdHocItem", () => {
  it("inserts an unchecked ad-hoc item", async () => {
    const { addAdHocItem } = await import("./shopping");
    await addAdHocItem("chocolate");

    const rows = await testDb.select().from(shoppingListExtra);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("chocolate");
    expect(rows[0].checked).toBe(0);
  });
});

describe("toggleAdHocItem", () => {
  it("flips checked from 0 to 1", async () => {
    const [item] = await testDb
      .insert(shoppingListExtra)
      .values({ name: "wine", checked: 0 })
      .returning();

    const { toggleAdHocItem } = await import("./shopping");
    await toggleAdHocItem(item.id, true);

    const rows = await testDb.select().from(shoppingListExtra);
    expect(rows[0].checked).toBe(1);
  });

  it("flips checked from 1 to 0", async () => {
    const [item] = await testDb
      .insert(shoppingListExtra)
      .values({ name: "wine", checked: 1 })
      .returning();

    const { toggleAdHocItem } = await import("./shopping");
    await toggleAdHocItem(item.id, false);

    const rows = await testDb.select().from(shoppingListExtra);
    expect(rows[0].checked).toBe(0);
  });
});

describe("removeAdHocItem", () => {
  it("deletes the ad-hoc item by id", async () => {
    const [item] = await testDb
      .insert(shoppingListExtra)
      .values({ name: "beer", checked: 0 })
      .returning();

    const { removeAdHocItem } = await import("./shopping");
    await removeAdHocItem(item.id);

    const rows = await testDb.select().from(shoppingListExtra);
    expect(rows).toHaveLength(0);
  });
});
