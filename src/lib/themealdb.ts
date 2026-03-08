export interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strInstructions: string;
  [key: string]: string | null;
}

export interface MealDBResponse {
  meals: MealDBMeal[] | null;
}

/**
 * Extracts up to 20 ingredient/measure pairs from a TheMealDB meal object.
 * Pure function — no side effects.
 */
export function extractIngredients(
  meal: Record<string, string | null | undefined>
): { name: string; measure: string }[] {
  const ingredients: { name: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] ?? "").trim();
    const measure = (meal[`strMeasure${i}`] ?? "").trim();
    if (name) {
      ingredients.push({ name, measure });
    }
  }
  return ingredients;
}
