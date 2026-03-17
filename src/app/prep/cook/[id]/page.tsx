export const dynamic = "force-dynamic";

import { db } from "@/db";
import { recipes, prepSessionTasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseSteps } from "@/lib/cooking";
import CookingClient from "@/components/CookingClient";

interface Props {
  params: Promise<{ id: string }>;
}

/** Returns batch tasks from prep sessions that include the given recipeId. */
async function getAlreadyPreppedTasks(
  recipeId: number
): Promise<Array<{ name: string; prep: string }>> {
  const allTasks = await db.select().from(prepSessionTasks);
  return allTasks.filter((task) => {
    try {
      const ids: unknown = JSON.parse(task.recipeIds);
      return Array.isArray(ids) && ids.includes(recipeId);
    } catch {
      return false;
    }
  });
}

export default async function CookPage({ params }: Props) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);

  if (isNaN(recipeId)) {
    return (
      <div className="p-6" data-testid="recipe-not-found">
        <p className="text-zinc-500">Recipe not found.</p>
      </div>
    );
  }

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe) {
    return (
      <div className="p-6" data-testid="recipe-not-found">
        <p className="text-zinc-500">Recipe not found.</p>
      </div>
    );
  }

  const prepSteps = parseSteps(recipe.prepSteps);
  const activeSteps = parseSteps(recipe.activeSteps);
  const alreadyPreppedTasks = await getAlreadyPreppedTasks(recipeId);

  return (
    <CookingClient
      recipeId={recipe.id}
      title={recipe.title}
      prepSteps={prepSteps}
      activeSteps={activeSteps}
      instructions={recipe.instructions}
      alreadyPreppedTasks={alreadyPreppedTasks}
    />
  );
}
