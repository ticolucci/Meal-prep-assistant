"use client";

import { useState, useTransition } from "react";
import type { Recipe } from "@/db/schema";
import {
  generateMealPlan,
  swapMeal,
  approveMealPlan,
} from "@/app/actions/meal-plan";

interface PlannedMeal {
  planRecipeId: number;
  position: number;
  recipe: Recipe;
}

interface PlanData {
  planId: number;
  meals: PlannedMeal[];
  status: string;
}

interface AllRecipe {
  id: number;
  title: string;
}

interface Props {
  initialPlan: PlanData | null;
  allRecipes: AllRecipe[];
}

export default function MealPlanClient({ initialPlan, allRecipes }: Props) {
  const [plan, setPlan] = useState<PlanData | null>(initialPlan);
  const [isPending, startTransition] = useTransition();
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
  const [approved, setApproved] = useState(
    initialPlan?.status === "approved"
  );

  // Form state for generation params
  const [mealCount, setMealCount] = useState(5);
  const [maxPrepMinutes, setMaxPrepMinutes] = useState("");
  const [includeIngredients, setIncludeIngredients] = useState("");
  const [excludeIngredients, setExcludeIngredients] = useState("");

  function parseIngredientList(raw: string) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function handleGenerate() {
    startTransition(async () => {
      const newPlan = await generateMealPlan({
        mealCount,
        maxPrepMinutes: maxPrepMinutes ? Number(maxPrepMinutes) : undefined,
        includeIngredients: parseIngredientList(includeIngredients),
        excludeIngredients: parseIngredientList(excludeIngredients),
      });

      // Re-fetch plan details from the server via a simple page reload approach.
      // Because generateMealPlan calls revalidatePath, the RSC will re-render.
      // For the client state, we optimistically reload.
      window.location.reload();
    });
  }

  function handleSwap(planRecipeId: number, oldRecipeId: number, idx: number) {
    setSwappingIdx(idx);
  }

  function handleSwapConfirm(
    planId: number,
    oldRecipeId: number,
    newRecipeId: number,
    idx: number
  ) {
    startTransition(async () => {
      await swapMeal({ planId, oldRecipeId, newRecipeId });
      setSwappingIdx(null);
      window.location.reload();
    });
  }

  function handleApprove(planId: number) {
    startTransition(async () => {
      await approveMealPlan(planId);
      setApproved(true);
      setPlan((prev) => (prev ? { ...prev, status: "approved" } : prev));
    });
  }

  // Recipes not in the current plan (for swap options)
  const planRecipeIds = plan?.meals.map((m) => m.recipe.id) ?? [];
  const swapOptions = allRecipes.filter((r) => !planRecipeIds.includes(r.id));

  return (
    <div className="p-4 space-y-6">
      {/* Generation form */}
      {(!plan || plan.status === "draft") && (
        <section
          className="bg-white dark:bg-zinc-800 rounded-xl shadow p-4 space-y-4"
          data-testid="plan-params-form"
        >
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Weekly Parameters
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-1">
                Meals per week
              </label>
              <input
                type="number"
                min={1}
                max={14}
                value={mealCount}
                onChange={(e) => setMealCount(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                data-testid="meal-count-input"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-1">
                Max prep time (min)
              </label>
              <input
                type="number"
                min={0}
                placeholder="Any"
                value={maxPrepMinutes}
                onChange={(e) => setMaxPrepMinutes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                data-testid="max-prep-input"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-1">
              Must include ingredients (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. chicken, pasta"
              value={includeIngredients}
              onChange={(e) => setIncludeIngredients(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              data-testid="include-ingredients-input"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-1">
              Exclude ingredients (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. shellfish, peanuts"
              value={excludeIngredients}
              onChange={(e) => setExcludeIngredients(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              data-testid="exclude-ingredients-input"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full bg-emerald-600 text-white rounded-xl py-3 font-semibold disabled:opacity-60"
            data-testid="generate-plan-button"
          >
            {isPending ? "Generating…" : "Generate Meal Plan"}
          </button>
        </section>
      )}

      {/* Plan review */}
      {plan && (
        <section data-testid="plan-review">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Your Plan
            </h2>
            {plan.status === "approved" && (
              <span
                className="text-emerald-600 font-semibold text-sm"
                data-testid="plan-approved-badge"
              >
                ✓ Approved
              </span>
            )}
          </div>

          <ul className="space-y-3">
            {plan.meals.map((meal, idx) => (
              <li
                key={meal.planRecipeId}
                className="bg-white dark:bg-zinc-800 rounded-xl shadow p-4"
                data-testid={`plan-meal-${idx}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400 mb-0.5">
                      Day {idx + 1}
                    </p>
                    <p
                      className="font-medium text-zinc-900 dark:text-zinc-50"
                      data-testid={`plan-meal-title-${idx}`}
                    >
                      {meal.recipe.title}
                    </p>
                  </div>

                  {plan.status === "draft" && (
                    <button
                      onClick={() =>
                        handleSwap(meal.planRecipeId, meal.recipe.id, idx)
                      }
                      className="text-sm text-emerald-600 font-medium px-3 py-1.5 border border-emerald-200 rounded-lg"
                      data-testid={`swap-button-${idx}`}
                    >
                      Swap
                    </button>
                  )}
                </div>

                {/* Swap picker */}
                {swappingIdx === idx && plan.status === "draft" && (
                  <div className="mt-3 space-y-2" data-testid={`swap-picker-${idx}`}>
                    <p className="text-xs text-zinc-500">Pick a replacement:</p>
                    {swapOptions.length === 0 ? (
                      <p className="text-xs text-zinc-400">No other recipes available.</p>
                    ) : (
                      <select
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSwapConfirm(
                              plan.planId,
                              meal.recipe.id,
                              Number(e.target.value),
                              idx
                            );
                          }
                        }}
                        data-testid={`swap-select-${idx}`}
                      >
                        <option value="" disabled>
                          Select a recipe…
                        </option>
                        {swapOptions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => setSwappingIdx(null)}
                      className="text-xs text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {plan.status === "draft" && (
            <button
              onClick={() => handleApprove(plan.planId)}
              disabled={isPending || approved}
              className="mt-4 w-full bg-emerald-600 text-white rounded-xl py-3 font-semibold disabled:opacity-60"
              data-testid="approve-plan-button"
            >
              {approved ? "Approved!" : isPending ? "Approving…" : "Approve Plan"}
            </button>
          )}

          {plan.status === "draft" && (
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="mt-2 w-full border border-zinc-300 rounded-xl py-2.5 text-sm text-zinc-600 disabled:opacity-60"
              data-testid="regenerate-plan-button"
            >
              Regenerate
            </button>
          )}
        </section>
      )}

      {!plan && allRecipes.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-8">
          No recipes in the database yet. Seed some recipes on the Recipes tab
          first.
        </p>
      )}
    </div>
  );
}
