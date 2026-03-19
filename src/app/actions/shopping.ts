"use server";

import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  recipeIngredients,
  mealPlans,
  mealPlanRecipes,
  pantryItems,
  shoppingListExtra,
} from "@/db/schema";
import {
  aggregateIngredients,
  subtractPantry,
  type AggregatedIngredient,
} from "@/lib/shopping";
import { revalidatePath } from "next/cache";
import type { PantryItem, ShoppingExtra } from "@/db/schema";

export interface ShoppingListResult {
  planId: number | null;
  items: AggregatedIngredient[];
  adHocItems: ShoppingExtra[];
  pantryItems: PantryItem[];
}

/**
 * Returns the shopping list derived from the latest approved plan.
 * Subtracts pantry items and includes any ad-hoc extras.
 */
export async function getShoppingList(): Promise<ShoppingListResult> {
  // Find the most recent approved plan
  const approvedPlans = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.status, "approved"))
    .orderBy(desc(mealPlans.createdAt), desc(mealPlans.id))
    .limit(1);

  const adHocItems = await db.select().from(shoppingListExtra);
  const pantry = await db.select().from(pantryItems);

  if (approvedPlans.length === 0) {
    return { planId: null, items: [], adHocItems, pantryItems: pantry };
  }

  const plan = approvedPlans[0];

  // Get recipe IDs in this plan
  const planRecipeRows = await db
    .select()
    .from(mealPlanRecipes)
    .where(eq(mealPlanRecipes.planId, plan.id));

  const recipeIds = planRecipeRows.map((r) => r.recipeId);

  if (recipeIds.length === 0) {
    return { planId: plan.id, items: [], adHocItems, pantryItems: pantry };
  }

  // Fetch all ingredients for those recipes
  const allIngredients = await db.select().from(recipeIngredients);
  const planIngredients = allIngredients.filter((i) =>
    recipeIds.includes(i.recipeId)
  );

  // Aggregate and subtract pantry
  const aggregated = aggregateIngredients(planIngredients);
  const pantryNames = pantry.map((p) => p.name);
  const items = subtractPantry(aggregated, pantryNames);

  return { planId: plan.id, items, adHocItems, pantryItems: pantry };
}

// ─── Pantry actions ───────────────────────────────────────────────────────────

export async function addPantryItem(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  // Ignore duplicates (unique constraint on name)
  try {
    await db.insert(pantryItems).values({ name: trimmed });
  } catch {
    // Duplicate — silently ignore
  }

  revalidatePath("/shopping");
}

export async function removePantryItem(id: number) {
  await db.delete(pantryItems).where(eq(pantryItems.id, id));
  revalidatePath("/shopping");
}

// ─── Ad-hoc item actions ──────────────────────────────────────────────────────

export async function addAdHocItem(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  await db.insert(shoppingListExtra).values({ name: trimmed, checked: 0 });
  revalidatePath("/shopping");
}

export async function toggleAdHocItem(id: number, checked: boolean) {
  await db
    .update(shoppingListExtra)
    .set({ checked: checked ? 1 : 0 })
    .where(eq(shoppingListExtra.id, id));
  revalidatePath("/shopping");
}

export async function removeAdHocItem(id: number) {
  await db.delete(shoppingListExtra).where(eq(shoppingListExtra.id, id));
  revalidatePath("/shopping");
}
