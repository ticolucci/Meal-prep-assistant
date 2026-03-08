"use server";

import { db } from "@/db";
import { recipes, recipeIngredients } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { extractIngredients } from "@/lib/themealdb";
import type { MealDBResponse } from "@/lib/themealdb";

const THEMEALDB_URL =
  "https://www.themealdb.com/api/json/v1/1/random.php";

export async function seedRecipes(): Promise<{
  success: boolean;
  message: string;
  recipeId?: number;
}> {
  try {
    const res = await fetch(THEMEALDB_URL, { cache: "no-store" });
    if (!res.ok) {
      return { success: false, message: "Failed to fetch from TheMealDB" };
    }

    const data: MealDBResponse = await res.json();
    const meal = data.meals?.[0];
    if (!meal) {
      return { success: false, message: "No meal returned from TheMealDB" };
    }

    // Skip if this meal is already in the DB
    const existing = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(eq(recipes.externalId, meal.idMeal))
      .limit(1);

    if (existing.length > 0) {
      revalidatePath("/recipes");
      return {
        success: true,
        message: "Recipe already seeded",
        recipeId: existing[0].id,
      };
    }

    // Insert recipe
    const [inserted] = await db
      .insert(recipes)
      .values({
        externalId: meal.idMeal,
        title: meal.strMeal,
        imageUrl: meal.strMealThumb,
        instructions: meal.strInstructions,
        source: "themealdb",
      })
      .returning({ id: recipes.id });

    // Insert ingredients
    const ingredients = extractIngredients(meal);
    if (ingredients.length > 0) {
      await db.insert(recipeIngredients).values(
        ingredients.map((ing) => ({
          recipeId: inserted.id,
          name: ing.name,
          measure: ing.measure || null,
        }))
      );
    }

    revalidatePath("/recipes");
    return {
      success: true,
      message: `Recipe "${meal.strMeal}" seeded successfully`,
      recipeId: inserted.id,
    };
  } catch (err) {
    console.error("seedRecipes error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
