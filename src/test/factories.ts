import { testDb } from "@/db/test-client";
import { recipes, recipeIngredients } from "@/db/schema";
import type { NewRecipe, NewRecipeIngredient } from "@/db/schema";

export async function makeRecipe(overrides: Partial<NewRecipe> = {}) {
  const [row] = await testDb
    .insert(recipes)
    .values({
      title: "Test Recipe",
      source: "manual",
      ...overrides,
    })
    .returning();
  return row;
}

export async function makeIngredient(
  overrides: Partial<NewRecipeIngredient> & { recipeId: number }
) {
  const [row] = await testDb
    .insert(recipeIngredients)
    .values({
      name: "test ingredient",
      ...overrides,
    })
    .returning();
  return row;
}
