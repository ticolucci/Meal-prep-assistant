export const dynamic = "force-dynamic";

import { db } from "@/db";
import { recipes, mealPlans, mealPlanRecipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import MealPlanClient from "@/components/MealPlanClient";

async function getLatestDraftPlan() {
  const plans = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.status, "draft"));

  if (plans.length === 0) return null;

  return plans.sort((a, b) => {
    const aTime =
      a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt);
    const bTime =
      b.createdAt instanceof Date ? b.createdAt.getTime() : Number(b.createdAt);
    return bTime - aTime;
  })[0];
}

export default async function PlanPage() {
  const allRecipes = await db.select().from(recipes);

  const latestDraftPlan = await getLatestDraftPlan();

  let initialPlan = null;
  if (latestDraftPlan) {
    const planRecipeRows = await db
      .select()
      .from(mealPlanRecipes)
      .where(eq(mealPlanRecipes.planId, latestDraftPlan.id));

    const planRecipeIds = planRecipeRows.map((r) => r.recipeId);
    const planRecipes = allRecipes.filter((r) => planRecipeIds.includes(r.id));

    const meals = planRecipeRows
      .sort((a, b) => a.position - b.position)
      .map((pr) => ({
        planRecipeId: pr.id,
        position: pr.position,
        recipe: planRecipes.find((r) => r.id === pr.recipeId)!,
      }))
      .filter((m) => m.recipe != null);

    initialPlan = {
      planId: latestDraftPlan.id,
      meals,
      status: latestDraftPlan.status,
    };
  }

  return (
    <div>
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Meal Plan
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Generate your weekly menu and approve it to build your shopping list.
        </p>
      </header>

      <MealPlanClient
        initialPlan={initialPlan}
        allRecipes={allRecipes.map((r) => ({ id: r.id, title: r.title }))}
      />
    </div>
  );
}
