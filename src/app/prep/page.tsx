export const dynamic = "force-dynamic";

import { db } from "@/db";
import { recipes, mealPlans, mealPlanRecipes } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import type { Recipe } from "@/db/schema";

async function getCookableRecipes(): Promise<{
  recipes: Recipe[];
  fromPlan: boolean;
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
      return { recipes: planRecipes, fromPlan: true };
    }
  }

  // Fallback: show all recipes so the cooking UI is always accessible
  const allRecipes = await db
    .select()
    .from(recipes)
    .orderBy(desc(recipes.createdAt));

  return { recipes: allRecipes, fromPlan: false };
}

export default async function PrepPage() {
  const { recipes: cookableRecipes, fromPlan } = await getCookableRecipes();

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
