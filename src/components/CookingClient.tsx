"use client";

import { useState } from "react";
import Link from "next/link";
import { isPrepDone } from "@/lib/cooking";

interface AlreadyPreppedTask {
  name: string;
  prep: string;
}

interface Props {
  recipeId: number;
  title: string;
  prepSteps: string[];
  activeSteps: string[];
  /** Raw instructions fallback when both step arrays are empty */
  instructions: string | null;
  /** Batch tasks from prep sessions that include this recipe — shown as "Already Prepped" */
  alreadyPreppedTasks?: AlreadyPreppedTask[];
}

export default function CookingClient({
  recipeId: _recipeId,
  title,
  prepSteps,
  activeSteps,
  instructions,
  alreadyPreppedTasks = [],
}: Props) {
  const [checkedPrep, setCheckedPrep] = useState<Set<number>>(new Set());
  const [prepSkipped, setPrepSkipped] = useState(false);

  const prepDone = prepSkipped || isPrepDone(prepSteps.length, checkedPrep);

  function togglePrep(index: number) {
    setCheckedPrep((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  const hasPrepSteps = prepSteps.length > 0;
  const hasActiveSteps = activeSteps.length > 0;
  const hasInstructions = !!instructions;

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Back link */}
      <Link
        href="/prep"
        className="text-sm text-emerald-600 hover:underline mb-4 inline-block"
      >
        ← Back to Prep
      </Link>

      <h1
        data-testid="recipe-title"
        className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2 mb-6"
      >
        {title}
      </h1>

      {/* ── Already Prepped in Session ──────────────────────────────────────── */}
      {alreadyPreppedTasks.length > 0 && (
        <section
          data-testid="already-prepped-section"
          className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4"
        >
          <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
            ✓ Already Prepped in Session
          </h2>
          <ul className="space-y-1">
            {alreadyPreppedTasks.map((task, i) => (
              <li
                key={i}
                data-testid="already-prepped-task"
                className="text-sm text-emerald-700 dark:text-emerald-400 capitalize"
              >
                {task.prep} {task.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Prep Steps ─────────────────────────────────────────────────────── */}
      {hasPrepSteps && (
        <section data-testid="prep-section" className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Prep
            </h2>
            {!prepDone && (
              <button
                data-testid="skip-prep-btn"
                onClick={() => setPrepSkipped(true)}
                className="text-sm text-zinc-500 hover:text-zinc-700 underline"
              >
                Skip Prep
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {prepSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`prep-step-${i}`}
                  data-testid={`prep-step-${i}`}
                  checked={checkedPrep.has(i)}
                  onChange={() => togglePrep(i)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label
                  htmlFor={`prep-step-${i}`}
                  className={`text-sm leading-relaxed cursor-pointer transition-colors ${
                    checkedPrep.has(i)
                      ? "line-through text-zinc-400"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {step}
                </label>
              </li>
            ))}
          </ul>

          {!prepDone && (
            <p className="mt-3 text-xs text-zinc-400">
              Check all prep steps or tap &quot;Skip Prep&quot; to reveal the
              active cooking steps.
            </p>
          )}
        </section>
      )}

      {/* ── Active Steps / Instructions ─────────────────────────────────────── */}
      <section
        data-testid="active-section"
        className={`transition-all duration-300 ${
          hasPrepSteps && !prepDone
            ? "opacity-30 pointer-events-none select-none"
            : "opacity-100"
        }`}
      >
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          {hasActiveSteps ? "Active Cooking" : "Instructions"}
        </h2>

        {hasActiveSteps ? (
          <ol className="space-y-3 list-decimal list-inside">
            {activeSteps.map((step, i) => (
              <li
                key={i}
                data-testid={`active-step-${i}`}
                className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
              >
                {step}
              </li>
            ))}
          </ol>
        ) : hasInstructions ? (
          <p
            data-testid="recipe-instructions"
            className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed"
          >
            {instructions}
          </p>
        ) : (
          <p className="text-sm text-zinc-400">
            No cooking steps recorded for this recipe.
          </p>
        )}
      </section>
    </div>
  );
}
