export const dynamic = "force-dynamic";

import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseSteps } from "@/lib/cooking";
import CookingClient from "@/components/CookingClient";

interface Props {
  params: Promise<{ id: string }>;
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

  return (
    <CookingClient
      recipeId={recipe.id}
      title={recipe.title}
      prepSteps={prepSteps}
      activeSteps={activeSteps}
      instructions={recipe.instructions}
    />
  );
}
