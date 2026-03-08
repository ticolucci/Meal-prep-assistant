"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  recipes,
  recipeIngredients,
  mealPlans,
  mealPlanRecipes,
} from "@/db/schema";
import { selectMealPlan, type PlanParams } from "@/lib/planner";
import { revalidatePath } from "next/cache";

/**
 * Fetches all recipes (with ingredients) from the DB, runs the planner
 * algorithm, persists a draft plan, and returns it.
 */
export async function generateMealPlan(params: PlanParams) {
  // Fetch all recipes + their ingredients
  const allRecipes = await db.select().from(recipes);
  const allIngredients = await db.select().from(recipeIngredients);

  // Build candidates (attach ingredients to each recipe)
  const candidates = allRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    prepMinutes: r.prepMinutes,
    ingredients: allIngredients
      .filter((i) => i.recipeId === r.id)
      .map((i) => ({ name: i.name })),
  }));

  const selected = selectMealPlan(candidates, params);

  // Persist draft plan
  const [plan] = await db
    .insert(mealPlans)
    .values({
      status: "draft",
      mealCount: params.mealCount,
      params: JSON.stringify(params),
    })
    .returning();

  // Insert plan_recipe rows
  if (selected.length > 0) {
    await db.insert(mealPlanRecipes).values(
      selected.map((r, idx) => ({
        planId: plan.id,
        recipeId: r.id,
        position: idx,
      }))
    );
  }

  revalidatePath("/plan");
  return plan;
}

/**
 * Swaps one recipe in a draft plan for another.
 */
export async function swapMeal({
  planId,
  oldRecipeId,
  newRecipeId,
}: {
  planId: number;
  oldRecipeId: number;
  newRecipeId: number;
}) {
  // Find the row to update
  const [row] = await db
    .select()
    .from(mealPlanRecipes)
    .where(
      eq(mealPlanRecipes.planId, planId)
    )
    .then((rows) => rows.filter((r) => r.recipeId === oldRecipeId));

  if (!row) return;

  await db
    .update(mealPlanRecipes)
    .set({ recipeId: newRecipeId })
    .where(eq(mealPlanRecipes.id, row.id));

  revalidatePath("/plan");
}

/**
 * Marks a draft plan as approved.
 */
export async function approveMealPlan(planId: number) {
  await db
    .update(mealPlans)
    .set({ status: "approved" })
    .where(eq(mealPlans.id, planId));

  revalidatePath("/plan");
}

/**
 * Fetches a plan with its full recipe details.
 */
export async function getMealPlanWithRecipes(planId: number) {
  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.id, planId));

  if (!plan) return null;

  const planRecipeRows = await db
    .select()
    .from(mealPlanRecipes)
    .where(eq(mealPlanRecipes.planId, planId));

  const recipeIds = planRecipeRows.map((r) => r.recipeId);
  const recipeRows =
    recipeIds.length > 0
      ? await db
          .select()
          .from(recipes)
          .then((all) => all.filter((r) => recipeIds.includes(r.id)))
      : [];

  const meals = planRecipeRows
    .sort((a, b) => a.position - b.position)
    .map((pr) => ({
      planRecipeId: pr.id,
      position: pr.position,
      recipe: recipeRows.find((r) => r.id === pr.recipeId)!,
    }))
    .filter((m) => m.recipe != null);

  return { plan, meals };
}

/**
 * Returns the most recent draft plan (if any), or null.
 */
export async function getLatestDraftPlan() {
  const plans = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.status, "draft"));

  if (plans.length === 0) return null;

  // Return the most recently created draft
  return plans.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : Number(b.createdAt);
    return bTime - aTime;
  })[0];
}
