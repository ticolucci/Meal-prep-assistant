export interface RecipeCandidate {
  id: number;
  title: string;
  prepMinutes?: number | null;
  ingredients: { name: string }[];
}

export interface PlanParams {
  mealCount: number;
  maxPrepMinutes?: number;
  includeIngredients?: string[];
  excludeIngredients?: string[];
}

/**
 * Pure function — no side effects. Selects up to `params.mealCount` recipes
 * from `candidates` that satisfy the filter constraints, preferring recipes
 * that share ingredients with already-selected ones (minimising food waste).
 *
 * Deterministic: same input → same output. Uses recipe ID as tiebreaker so
 * the result is stable across calls.
 */
export function selectMealPlan(
  candidates: RecipeCandidate[],
  params: PlanParams
): RecipeCandidate[] {
  // 1. Apply filters
  let pool = candidates.filter((r) => {
    // Exclude recipes whose prep time exceeds the max (null = unknown, keep it)
    if (
      params.maxPrepMinutes != null &&
      r.prepMinutes != null &&
      r.prepMinutes > params.maxPrepMinutes
    ) {
      return false;
    }

    const ingredientNames = r.ingredients.map((i) => i.name.toLowerCase());

    // Exclude recipes that contain any excluded ingredient
    if (params.excludeIngredients?.length) {
      if (
        params.excludeIngredients.some((exc) =>
          ingredientNames.includes(exc.toLowerCase())
        )
      ) {
        return false;
      }
    }

    // Include only recipes that contain at least one required ingredient
    if (params.includeIngredients?.length) {
      if (
        !params.includeIngredients.some((inc) =>
          ingredientNames.includes(inc.toLowerCase())
        )
      ) {
        return false;
      }
    }

    return true;
  });

  // 2. Sort by ID to ensure a deterministic starting order
  pool = pool.slice().sort((a, b) => a.id - b.id);

  // 3. Greedy selection: at each step pick the candidate that shares the most
  //    ingredients with already-selected recipes (maximises ingredient reuse).
  //    Ties broken by lowest ID.
  const selected: RecipeCandidate[] = [];
  const selectedIngredientNames = new Set<string>();
  const needed = Math.min(params.mealCount, pool.length);

  while (selected.length < needed) {
    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const names = candidate.ingredients.map((ing) => ing.name.toLowerCase());
      const overlap = names.filter((n) => selectedIngredientNames.has(n)).length;

      // Primary sort: more overlap = better. Secondary: lower ID = better.
      if (
        overlap > bestScore ||
        (overlap === bestScore && candidate.id < pool[bestIdx].id)
      ) {
        bestScore = overlap;
        bestIdx = i;
      }
    }

    const chosen = pool[bestIdx];
    selected.push(chosen);
    chosen.ingredients.forEach((ing) =>
      selectedIngredientNames.add(ing.name.toLowerCase())
    );
    pool.splice(bestIdx, 1);
  }

  return selected;
}
