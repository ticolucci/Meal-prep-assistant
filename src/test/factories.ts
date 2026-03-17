import { testDb } from "@/db/test-client";
import { recipes, recipeIngredients, prepSessions, prepSessionTasks } from "@/db/schema";
import type { NewRecipe, NewRecipeIngredient, NewPrepSession, NewPrepSessionTask } from "@/db/schema";

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

export async function makePrepSession(overrides: Partial<NewPrepSession> = {}) {
  const [row] = await testDb
    .insert(prepSessions)
    .values({
      date: "2026-03-17",
      label: "Test Session",
      ...overrides,
    })
    .returning();
  return row;
}

export async function makePrepSessionTask(
  overrides: Partial<NewPrepSessionTask> & { sessionId: number }
) {
  const [row] = await testDb
    .insert(prepSessionTasks)
    .values({
      name: "test ingredient",
      prep: "diced",
      prepSafe: 1,
      unitMismatch: 0,
      recipeCount: 2,
      recipeIds: "[]",
      ...overrides,
    })
    .returning();
  return row;
}
