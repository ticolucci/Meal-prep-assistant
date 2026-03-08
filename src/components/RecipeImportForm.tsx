"use client";

import { useTransition, useState } from "react";
import { parseRecipeText } from "@/app/actions/parse-recipe";
import type { ParseRecipeResult } from "@/app/actions/parse-recipe";
import { useRouter } from "next/navigation";

type ParsedRecipe = NonNullable<ParseRecipeResult["parsed"]>;

export default function RecipeImportForm() {
  const [isPending, startTransition] = useTransition();
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;

    setError(null);
    setParsed(null);

    startTransition(async () => {
      const result = await parseRecipeText(rawText);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setParsed(result.parsed!);
      setSavedId(result.recipeId!);
    });
  }

  if (savedId && parsed) {
    return (
      <div data-testid="import-success" className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-700">
            Recipe saved successfully!
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
          <h2
            data-testid="parsed-title"
            className="text-xl font-bold text-zinc-900"
          >
            {parsed.title}
          </h2>

          <section>
            <h3 className="font-semibold text-zinc-700 mb-2">Ingredients</h3>
            <ul
              data-testid="parsed-ingredients"
              className="space-y-1 text-sm text-zinc-600"
            >
              {parsed.ingredients.map((ing, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-zinc-400 w-20 shrink-0">
                    {ing.amount != null ? ing.amount : ""}
                    {ing.unit ? ` ${ing.unit}` : ""}
                  </span>
                  <span>
                    {ing.prep ? `${ing.prep} ` : ""}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-zinc-700 mb-2">Prep Steps</h3>
            <ol
              data-testid="parsed-prep-steps"
              className="list-decimal list-inside space-y-1 text-sm text-zinc-600"
            >
              {parsed.prep_steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="font-semibold text-zinc-700 mb-2">
              Active Cooking Steps
            </h3>
            <ol
              data-testid="parsed-active-steps"
              className="list-decimal list-inside space-y-1 text-sm text-zinc-600"
            >
              {parsed.active_steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
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
        disabled={isPending || !rawText.trim()}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Parsing recipe…" : "Import Recipe"}
      </button>
    </form>
  );
}
