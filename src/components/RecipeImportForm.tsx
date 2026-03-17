"use client";

import { useTransition, useState } from "react";
import { parseRecipeText, saveRecipe } from "@/app/actions/parse-recipe";
import type { ParsedRecipe, ParsedIngredient } from "@/app/actions/parse-recipe";
import { useRouter } from "next/navigation";

export default function RecipeImportForm() {
  const [isParsing, startParsing] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Editable review state
  const [reviewData, setReviewData] = useState<ParsedRecipe | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;
    setError(null);
    setReviewData(null);
    startParsing(async () => {
      const result = await parseRecipeText(rawText);
      if (!result.success || !result.parsed) {
        setError(result.message);
        return;
      }
      setReviewData(result.parsed);
    });
  }

  function handleCancel() {
    setReviewData(null);
    setError(null);
  }

  function handleSave() {
    if (!reviewData) return;
    startSaving(async () => {
      const result = await saveRecipe(reviewData);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSavedId(result.recipeId!);
    });
  }

  // ── Helpers to update review data ───────────────────────────────────────────

  function setTitle(title: string) {
    setReviewData((d) => d ? { ...d, title } : d);
  }

  function updateIngredient(index: number, patch: Partial<ParsedIngredient>) {
    setReviewData((d) => {
      if (!d) return d;
      const ingredients = d.ingredients.map((ing, i) =>
        i === index ? { ...ing, ...patch } : ing
      );
      return { ...d, ingredients };
    });
  }

  function addIngredient() {
    setReviewData((d) =>
      d ? { ...d, ingredients: [...d.ingredients, { name: "", prep: null, amount: null, unit: "" }] } : d
    );
  }

  function removeIngredient(index: number) {
    setReviewData((d) =>
      d ? { ...d, ingredients: d.ingredients.filter((_, i) => i !== index) } : d
    );
  }

  function updateStep(type: "prep_steps" | "active_steps", index: number, value: string) {
    setReviewData((d) => {
      if (!d) return d;
      const steps = d[type].map((s, i) => (i === index ? value : s));
      return { ...d, [type]: steps };
    });
  }

  function addStep(type: "prep_steps" | "active_steps") {
    setReviewData((d) =>
      d ? { ...d, [type]: [...d[type], ""] } : d
    );
  }

  function removeStep(type: "prep_steps" | "active_steps", index: number) {
    setReviewData((d) =>
      d ? { ...d, [type]: d[type].filter((_, i) => i !== index) } : d
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────

  if (savedId) {
    return (
      <div data-testid="import-success" className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-700">
            Recipe saved successfully!
          </p>
        </div>
        <button
          onClick={() => router.push("/recipes")}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"
        >
          View All Recipes
        </button>
      </div>
    );
  }

  // ── Editable review panel ────────────────────────────────────────────────────

  if (reviewData) {
    return (
      <div data-testid="review-panel" className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">
            Review and correct the AI-extracted data before saving.
          </p>
        </div>

        {error && (
          <p
            data-testid="import-error"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Recipe Title
          </label>
          <input
            data-testid="review-title"
            type="text"
            value={reviewData.title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Ingredients */}
        <section>
          <h3 className="font-semibold text-zinc-700 mb-2">Ingredients</h3>
          <ul data-testid="review-ingredients" className="space-y-2">
            {reviewData.ingredients.map((ing, i) => (
              <li key={i} data-testid="review-ingredient-row" className="flex gap-2 items-center">
                <input
                  aria-label="amount"
                  type="number"
                  value={ing.amount ?? ""}
                  onChange={(e) =>
                    updateIngredient(i, {
                      amount: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                  className="w-20 shrink-0 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="amt"
                />
                <input
                  aria-label="unit"
                  type="text"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                  className="w-20 shrink-0 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="unit"
                />
                <input
                  aria-label="prep"
                  type="text"
                  value={ing.prep ?? ""}
                  onChange={(e) =>
                    updateIngredient(i, { prep: e.target.value || null })
                  }
                  className="w-24 shrink-0 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="prep"
                />
                <input
                  aria-label="name"
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="ingredient name"
                />
                <button
                  data-testid="remove-ingredient-btn"
                  onClick={() => removeIngredient(i)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  aria-label="Remove ingredient"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            data-testid="add-ingredient-btn"
            onClick={addIngredient}
            className="mt-2 text-sm text-emerald-600 hover:underline"
          >
            + Add ingredient
          </button>
        </section>

        {/* Prep Steps */}
        <section>
          <h3 className="font-semibold text-zinc-700 mb-2">Prep Steps</h3>
          <ol data-testid="review-prep-steps" className="space-y-2">
            {reviewData.prep_steps.map((step, i) => (
              <li key={i} data-testid="review-prep-step-row" className="flex gap-2 items-center">
                <span className="text-zinc-400 text-sm w-5 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => updateStep("prep_steps", i, e.target.value)}
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => removeStep("prep_steps", i)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  aria-label="Remove prep step"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <button
            data-testid="add-prep-step-btn"
            onClick={() => addStep("prep_steps")}
            className="mt-2 text-sm text-emerald-600 hover:underline"
          >
            + Add prep step
          </button>
        </section>

        {/* Active Cooking Steps */}
        <section>
          <h3 className="font-semibold text-zinc-700 mb-2">Active Cooking Steps</h3>
          <ol data-testid="review-active-steps" className="space-y-2">
            {reviewData.active_steps.map((step, i) => (
              <li key={i} data-testid="review-active-step-row" className="flex gap-2 items-center">
                <span className="text-zinc-400 text-sm w-5 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => updateStep("active_steps", i, e.target.value)}
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => removeStep("active_steps", i)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  aria-label="Remove active step"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <button
            data-testid="add-active-step-btn"
            onClick={() => addStep("active_steps")}
            className="mt-2 text-sm text-emerald-600 hover:underline"
          >
            + Add active step
          </button>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            data-testid="cancel-import-btn"
            onClick={handleCancel}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            data-testid="save-recipe-btn"
            onClick={handleSave}
            disabled={isSaving || !reviewData.title.trim()}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save Recipe"}
          </button>
        </div>
      </div>
    );
  }

  // ── Import form ──────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="recipe-text"
          className="block text-sm font-medium text-zinc-700 mb-1"
        >
          Paste recipe text or URL
        </label>
        <textarea
          id="recipe-text"
          data-testid="recipe-input"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={10}
          placeholder="Paste a recipe URL (e.g. https://...) or the full recipe text here…"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
        />
      </div>

      {error && (
        <p
          data-testid="import-error"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        data-testid="import-submit"
        disabled={isParsing || !rawText.trim()}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isParsing ? "Parsing recipe…" : "Import Recipe"}
      </button>
    </form>
  );
}
