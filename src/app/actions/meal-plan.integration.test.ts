import { describe, it, expect, beforeEach } from "vitest";
import { testDb } from "@/db/test-client";
import {
  recipes,
  recipeIngredients,
  mealPlans,
  mealPlanRecipes,
} from "@/db/schema";
import { makeRecipe, makeIngredient } from "@/test/factories";

// Clean up tables before each test to ensure isolation
beforeEach(async () => {
  await testDb.delete(mealPlanRecipes);
  await testDb.delete(mealPlans);
  await testDb.delete(recipeIngredients);
  await testDb.delete(recipes);
});

describe("generateMealPlan", () => {
  it("creates a draft plan in the DB with the correct number of meals", async () => {
    // Seed 5 recipes
    for (let i = 0; i < 5; i++) {
      const r = await makeRecipe({ title: `Recipe ${i}` });
      await makeIngredient({ recipeId: r.id, name: `ingredient-${i}` });
    }

    const { generateMealPlan } = await import("./meal-plan");
    const plan = await generateMealPlan({ mealCount: 3 });

    expect(plan.status).toBe("draft");
    expect(plan.mealCount).toBe(3);

    // Verify the plan_recipes rows exist
    const rows = await testDb
      .select()
      .from(mealPlanRecipes)
      .where(
        (await import("drizzle-orm")).eq(mealPlanRecipes.planId, plan.id)
      );
    expect(rows).toHaveLength(3);
  });

  it("respects excludeIngredients param", async () => {
    const r1 = await makeRecipe({ title: "Chicken Pasta" });
    await makeIngredient({ recipeId: r1.id, name: "chicken" });
    const r2 = await makeRecipe({ title: "Veggie Stir Fry" });
    await makeIngredient({ recipeId: r2.id, name: "tofu" });
    const r3 = await makeRecipe({ title: "Beef Tacos" });
    await makeIngredient({ recipeId: r3.id, name: "beef" });

    const { generateMealPlan } = await import("./meal-plan");
    const plan = await generateMealPlan({
      mealCount: 3,
      excludeIngredients: ["chicken"],
    });

    const rows = await testDb
      .select()
      .from(mealPlanRecipes)
      .where(
        (await import("drizzle-orm")).eq(mealPlanRecipes.planId, plan.id)
      );
    const planRecipeIds = rows.map((r) => r.recipeId);
    expect(planRecipeIds).not.toContain(r1.id);
  });

  it("returns a plan with fewer meals if not enough recipes match", async () => {
    const r = await makeRecipe({ title: "Only Recipe" });
    await makeIngredient({ recipeId: r.id, name: "pasta" });

    const { generateMealPlan } = await import("./meal-plan");
    const plan = await generateMealPlan({ mealCount: 5 });

    const rows = await testDb
      .select()
      .from(mealPlanRecipes)
      .where(
        (await import("drizzle-orm")).eq(mealPlanRecipes.planId, plan.id)
      );
    expect(rows).toHaveLength(1);
  });
});

describe("swapMeal", () => {
  it("replaces a recipe in the plan with a different one", async () => {
    const r1 = await makeRecipe({ title: "Original" });
    const r2 = await makeRecipe({ title: "Replacement" });

    // Create a draft plan with r1
    const [plan] = await testDb
      .insert(mealPlans)
      .values({ status: "draft", mealCount: 1, params: "{}" })
      .returning();
    await testDb
      .insert(mealPlanRecipes)
      .values({ planId: plan.id, recipeId: r1.id, position: 0 });

    const { swapMeal } = await import("./meal-plan");
    await swapMeal({ planId: plan.id, oldRecipeId: r1.id, newRecipeId: r2.id });

    const rows = await testDb
      .select()
      .from(mealPlanRecipes)
      .where(
        (await import("drizzle-orm")).eq(mealPlanRecipes.planId, plan.id)
      );
    const ids = rows.map((r) => r.recipeId);
    expect(ids).not.toContain(r1.id);
    expect(ids).toContain(r2.id);
  });
});

describe("approveMealPlan", () => {
  it("changes plan status from draft to approved", async () => {
    const [plan] = await testDb
      .insert(mealPlans)
      .values({ status: "draft", mealCount: 2, params: "{}" })
      .returning();

    const { approveMealPlan } = await import("./meal-plan");
    await approveMealPlan(plan.id);

    const [updated] = await testDb
      .select()
      .from(mealPlans)
      .where((await import("drizzle-orm")).eq(mealPlans.id, plan.id));
    expect(updated.status).toBe("approved");
  });
});
