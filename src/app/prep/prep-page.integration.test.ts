import { describe, it, expect, beforeEach } from "vitest";
import { testDb } from "@/db/test-client";
import { recipes, recipeIngredients, mealPlans, mealPlanRecipes } from "@/db/schema";
import { makeRecipe, makeIngredient } from "@/test/factories";
import { eq } from "drizzle-orm";
import { batchPrepTasks, type MenuEntry } from "@/lib/batching";

// Mirrors the getBatchedTasks logic from prep/page.tsx so we can test the
// DB query + batching integration without spinning up the RSC.
async function getBatchedTasks(
  recipeIds: number[],
  planId: number | null
) {
  if (recipeIds.length === 0 || planId === null) return [];

  const allIngredients = await testDb
    .select()
    .from(recipeIngredients)
    .where(
      (await import("drizzle-orm")).inArray(recipeIngredients.recipeId, recipeIds)
    );

  const allRecipes = await testDb
    .select()
    .from(recipes)
    .where((await import("drizzle-orm")).inArray(recipes.id, recipeIds));

  const menu: MenuEntry[] = allRecipes.map((recipe) => ({
    recipeId: recipe.id,
    title: recipe.title,
    ingredients: allIngredients.filter((i) => i.recipeId === recipe.id),
  }));

  return batchPrepTasks(menu);
}

beforeEach(async () => {
  await testDb.delete(mealPlanRecipes);
  await testDb.delete(mealPlans);
  await testDb.delete(recipeIngredients);
  await testDb.delete(recipes);
});

describe("getBatchedTasks (prep page DB query + batching)", () => {
  it("returns empty array when planId is null (no approved plan)", async () => {
    const r = await makeRecipe();
    await makeIngredient({ recipeId: r.id, name: "onion", prep: "diced" });

    const result = await getBatchedTasks([r.id], null);
    expect(result).toEqual([]);
  });

  it("returns empty array when no recipe ids provided", async () => {
    const [plan] = await testDb
      .insert(mealPlans)
      .values({ status: "approved", mealCount: 0, params: "{}" })
      .returning();

    const result = await getBatchedTasks([], plan.id);
    expect(result).toEqual([]);
  });

  it("returns batched tasks when 2+ recipes share the same (name, prep)", async () => {
    const r1 = await makeRecipe({ title: "Pasta" });
    const r2 = await makeRecipe({ title: "Stir Fry" });

    await makeIngredient({ recipeId: r1.id, name: "onion", prep: "diced", amount: 1, unit: "cup" });
    await makeIngredient({ recipeId: r2.id, name: "onion", prep: "diced", amount: 0.5, unit: "cup" });

    const [plan] = await testDb
      .insert(mealPlans)
      .values({ status: "approved", mealCount: 2, params: "{}" })
      .returning();

    const result = await getBatchedTasks([r1.id, r2.id], plan.id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("onion");
    expect(result[0].prep).toBe("diced");
    expect(result[0].totalAmount).toBe(1.5);
    expect(result[0].unit).toBe("cup");
    expect(result[0].recipeCount).toBe(2);
  });

  it("does not batch ingredients that appear in only one recipe", async () => {
    const r1 = await makeRecipe({ title: "Solo" });
    await makeIngredient({ recipeId: r1.id, name: "garlic", prep: "minced" });

    const [plan] = await testDb
      .insert(mealPlans)
      .values({ status: "approved", mealCount: 1, params: "{}" })
      .returning();

    const result = await getBatchedTasks([r1.id], plan.id);
    expect(result).toEqual([]);
  });

  it("correctly marks prep-safe ingredients", async () => {
    const r1 = await makeRecipe({ title: "Soup" });
    const r2 = await makeRecipe({ title: "Salad" });

    await makeIngredient({ recipeId: r1.id, name: "carrot", prep: "sliced" });
    await makeIngredient({ recipeId: r2.id, name: "carrot", prep: "sliced" });

    const [plan] = await testDb
      .insert(mealPlans)
      .values({ status: "approved", mealCount: 2, params: "{}" })
      .returning();

    const result = await getBatchedTasks([r1.id, r2.id], plan.id);

    expect(result).toHaveLength(1);
    expect(result[0].prepSafe).toBe(true);
  });
});
