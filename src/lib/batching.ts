import type { RecipeIngredient } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuEntry {
  recipeId: number;
  title: string;
  ingredients: RecipeIngredient[];
}

export interface BatchedPrepTask {
  /** Normalized (lowercase, trimmed) ingredient name */
  name: string;
  /** Normalized (lowercase, trimmed) prep action */
  prep: string;
  /** Summed amount across all recipes. null if all amounts are null or units mismatch. */
  totalAmount: number | null;
  /** Common unit. null if units differ (see unitMismatch) or no unit. */
  unit: string | null;
  /** true if the same ingredient appears with different units across recipes */
  unitMismatch: boolean;
  /** true if this ingredient is known to be safe to prep ahead of time */
  prepSafe: boolean;
  /** Number of distinct recipes that need this prep task */
  recipeCount: number;
  /** IDs of the recipes that need this prep task */
  recipeIds: number[];
}

// ─── Prep-ahead safe ingredient allowlist ────────────────────────────────────

/**
 * Ingredients that are safe to fully prep 1–3 days in advance without
 * significant quality loss. Stored as lowercase substring matches.
 */
const PREP_SAFE_KEYWORDS: string[] = [
  "onion",
  "garlic",
  "carrot",
  "celery",
  "bell pepper",
  "sweet potato",
  "potato",
  "broccoli",
  "cauliflower",
  "mushroom",
  "cabbage",
  "kale",
  "leek",
  "fennel",
  "beetroot",
  "beet",
  "turnip",
  "radish",
  "ginger",
  "scallion",
  "chive",
  "shallot",
  "zucchini",
  "eggplant",
  "squash",
];

function isPrepSafe(name: string): boolean {
  const lower = name.toLowerCase();
  return PREP_SAFE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Cross-references all recipes in the weekly menu to find identical prep tasks
 * (same ingredient name + same prep action across multiple recipes), and
 * combines them into unified batch tasks.
 *
 * Pure function — no side effects, no DB calls.
 *
 * @param menu  - Array of menu entries (recipe + its ingredients).
 * @returns     - Sorted array of batched prep tasks (only tasks spanning 2+ recipes).
 */
export function batchPrepTasks(menu: MenuEntry[]): BatchedPrepTask[] {
  // Map from "(name)::(prep)" → per-recipe contribution tracking
  type GroupAccumulator = {
    name: string;
    prep: string;
    // Map from recipeId → list of {amount, unit} entries from that recipe
    byRecipe: Map<number, Array<{ amount: number | null; unit: string | null }>>;
  };

  const groups = new Map<string, GroupAccumulator>();

  for (const entry of menu) {
    for (const ingredient of entry.ingredients) {
      const rawPrep = ingredient.prep;
      if (!rawPrep || rawPrep.trim() === "") continue;

      const normName = ingredient.name.toLowerCase().trim();
      const normPrep = rawPrep.toLowerCase().trim();
      const key = `${normName}::${normPrep}`;

      if (!groups.has(key)) {
        groups.set(key, {
          name: normName,
          prep: normPrep,
          byRecipe: new Map(),
        });
      }

      const group = groups.get(key)!;
      if (!group.byRecipe.has(entry.recipeId)) {
        group.byRecipe.set(entry.recipeId, []);
      }
      group.byRecipe.get(entry.recipeId)!.push({
        amount: ingredient.amount ?? null,
        unit: ingredient.unit ?? null,
      });
    }
  }

  const result: BatchedPrepTask[] = [];

  for (const group of groups.values()) {
    // Only batch tasks that appear in 2 or more distinct recipes
    if (group.byRecipe.size < 2) continue;

    const recipeIds = Array.from(group.byRecipe.keys());
    const recipeCount = recipeIds.length;

    // Flatten all entries across all recipes
    const allEntries = recipeIds.flatMap((id) => group.byRecipe.get(id)!);

    // Determine unit consistency
    const nonNullUnits = allEntries
      .map((e) => e.unit)
      .filter((u): u is string => u !== null);

    const uniqueUnits = new Set(nonNullUnits);
    const unitMismatch = uniqueUnits.size > 1;

    let unit: string | null = null;
    let totalAmount: number | null = null;

    if (!unitMismatch) {
      // All non-null units are the same (or none)
      unit = uniqueUnits.size === 1 ? [...uniqueUnits][0] : null;

      const hasAnyAmount = allEntries.some((e) => e.amount !== null);
      if (hasAnyAmount) {
        totalAmount = allEntries.reduce(
          (sum, e) => sum + (e.amount ?? 0),
          0
        );
      }
      // else totalAmount stays null (all amounts are null)
    }
    // unitMismatch → unit=null, totalAmount=null (can't sum across units)

    result.push({
      name: group.name,
      prep: group.prep,
      totalAmount,
      unit,
      unitMismatch,
      prepSafe: isPrepSafe(group.name),
      recipeCount,
      recipeIds,
    });
  }

  // Sort: prepSafe=true first, then by recipeCount descending, then by name
  result.sort((a, b) => {
    if (a.prepSafe !== b.prepSafe) return a.prepSafe ? -1 : 1;
    if (b.recipeCount !== a.recipeCount) return b.recipeCount - a.recipeCount;
    return a.name.localeCompare(b.name);
  });

  return result;
}
