export const dynamic = "force-dynamic";

import { db } from "@/db";
import { recipes, mealPlans, mealPlanRecipes, recipeIngredients } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import type { Recipe } from "@/db/schema";
import { batchPrepTasks, type BatchedPrepTask, type MenuEntry } from "@/lib/batching";

async function getCookableRecipes(): Promise<{
  recipes: Recipe[];
  fromPlan: boolean;
  planId: number | null;
}> {
  // Try to get the latest approved plan
  const [approvedPlan] = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.status, "approved"))
    .orderBy(desc(mealPlans.createdAt), desc(mealPlans.id))
    .limit(1);

  if (approvedPlan) {
    const planRecipeLinks = await db
      .select()
      .from(mealPlanRecipes)
      .where(eq(mealPlanRecipes.planId, approvedPlan.id));

    if (planRecipeLinks.length > 0) {
      const recipeIds = planRecipeLinks.map((r) => r.recipeId);
      const planRecipes = await db
        .select()
        .from(recipes)
        .where(inArray(recipes.id, recipeIds))
        .orderBy(desc(recipes.createdAt));
      return { recipes: planRecipes, fromPlan: true, planId: approvedPlan.id };
    }
  }

  // Fallback: show all recipes so the cooking UI is always accessible
  const allRecipes = await db
    .select()
    .from(recipes)
    .orderBy(desc(recipes.createdAt));

  return { recipes: allRecipes, fromPlan: false, planId: null };
}

async function getBatchedTasks(
  cookableRecipes: Recipe[],
  planId: number | null
): Promise<BatchedPrepTask[]> {
  if (cookableRecipes.length === 0) return [];

  const recipeIds = cookableRecipes.map((r) => r.id);
  const allIngredients = await db
    .select()
    .from(recipeIngredients)
    .where(inArray(recipeIngredients.recipeId, recipeIds));

  // Only run batching when we have an approved plan (meaningful batching context)
  if (planId === null) return [];

  const menu: MenuEntry[] = cookableRecipes.map((recipe) => ({
    recipeId: recipe.id,
    title: recipe.title,
    ingredients: allIngredients.filter((i) => i.recipeId === recipe.id),
  }));

  return batchPrepTasks(menu);
}

export default async function PrepPage() {
  const { recipes: cookableRecipes, fromPlan, planId } = await getCookableRecipes();
  const batchedTasks = await getBatchedTasks(cookableRecipes, planId);

  return (
    <div className="p-4 pb-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Prep
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {fromPlan
            ? "This week's recipes — tap Cook to start."
            : "All recipes — tap Cook to start cooking."}
        </p>
      </div>

      {/* Batch Prep Tasks section — only shown when there's an approved plan with batchable tasks */}
      {batchedTasks.length > 0 && (
        <section className="mb-8" data-testid="batch-prep-section">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Batch Prep Tasks
          </h2>
          <p className="text-xs text-zinc-500 mb-3">
            These ingredients are needed in multiple recipes — prep them all at once.
          </p>
          <ul className="space-y-2">
            {batchedTasks.map((task, idx) => (
              <li
                key={idx}
                data-testid="batch-prep-task"
                className="flex items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50 capitalize">
                    {task.prep} {task.name}
                    {task.totalAmount != null && task.unit && (
                      <span className="font-normal text-zinc-500">
                        {" "}— {task.totalAmount} {task.unit}
                      </span>
                    )}
                    {task.unitMismatch && (
                      <span className="font-normal text-amber-600">
                        {" "}(mixed units)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Used in {task.recipeCount} recipes
                    {task.prepSafe ? (
                      <span className="ml-2 text-emerald-600 font-medium" data-testid="prep-safe-badge">
                        ✓ Prep-ahead safe
                      </span>
                    ) : (
                      <span className="ml-2 text-amber-500" data-testid="prep-not-safe-badge">
                        Prep just before serving
                      </span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cookableRecipes.length === 0 ? (
        <div
          data-testid="prep-empty-state"
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <p className="text-zinc-400 text-lg">No recipes yet.</p>
          <p className="text-zinc-400 text-sm mt-1">
            Add recipes in the{" "}
            <Link href="/recipes" className="text-emerald-600 underline">
              Recipes tab
            </Link>
            , then generate a meal plan.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cookableRecipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                  {recipe.title}
                </p>
                {recipe.prepSteps && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Has structured prep steps
                  </p>
                )}
              </div>
              <Link
                href={`/prep/cook/${recipe.id}`}
                data-testid="cook-link"
                className="ml-4 shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
              >
                Cook
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
