"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAdHocItem,
  toggleAdHocItem,
  removeAdHocItem,
  addPantryItem,
  removePantryItem,
} from "@/app/actions/shopping";
import type { AggregatedIngredient } from "@/lib/shopping";
import type { PantryItem, ShoppingExtra } from "@/db/schema";

interface Props {
  planId: number | null;
  items: AggregatedIngredient[];
  adHocItems: ShoppingExtra[];
  pantryItems: PantryItem[];
}

// ─── Category colour chips ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Produce: "bg-green-100 text-green-800",
  Meat: "bg-red-100 text-red-800",
  Dairy: "bg-blue-100 text-blue-800",
  Seafood: "bg-cyan-100 text-cyan-800",
  Bakery: "bg-amber-100 text-amber-800",
  Frozen: "bg-indigo-100 text-indigo-800",
  Pantry: "bg-yellow-100 text-yellow-800",
  Other: "bg-zinc-100 text-zinc-600",
};

function formatAmount(amount: number | null, unit: string | null): string {
  if (amount == null) return unit ?? "";
  const rounded = Math.round(amount * 100) / 100;
  return unit ? `${rounded} ${unit}` : `${rounded}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShoppingListClient({
  planId,
  items,
  adHocItems,
  pantryItems,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [newItem, setNewItem] = useState("");
  const [newPantry, setNewPantry] = useState("");
  const [showPantry, setShowPantry] = useState(false);

  // ── Aggregated item checkbox ──
  function toggleCheck(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Add ad-hoc item ──
  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    startTransition(async () => {
      await addAdHocItem(newItem.trim());
      setNewItem("");
      router.refresh();
    });
  }

  // ── Add pantry item ──
  function handleAddPantry(e: React.FormEvent) {
    e.preventDefault();
    if (!newPantry.trim()) return;
    startTransition(async () => {
      await addPantryItem(newPantry.trim());
      setNewPantry("");
      router.refresh();
    });
  }

  // Group aggregated items by category
  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  return (
    <div className="space-y-6">
      {/* ── No plan message ── */}
      {planId == null && (
        <div
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500"
          data-testid="no-plan-message"
        >
          No approved meal plan found. Approve a plan on the{" "}
          <a href="/plan" className="underline text-emerald-600">
            Plan
          </a>{" "}
          page first.
        </div>
      )}

      {/* ── Aggregated items grouped by category ── */}
      {categories.map((category) => {
        const categoryItems = items.filter((i) => i.category === category);
        return (
          <section key={category}>
            <h2
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400"
              data-testid={`category-heading-${category}`}
            >
              {category}
            </h2>
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
              {categoryItems.map((item) => {
                const key = `${item.name}::${item.unit ?? "null"}`;
                const isChecked = checked.has(key);
                return (
                  <li
                    key={key}
                    className="flex items-center gap-3 px-4 py-3"
                    data-testid="shopping-item"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(key)}
                      className="h-4 w-4 rounded accent-emerald-600"
                      aria-label={`Check off ${item.name}`}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        isChecked ? "line-through text-zinc-400" : "text-zinc-800"
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatAmount(item.amount, item.unit)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other
                      }`}
                    >
                      {item.category}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* ── Ad-hoc items ── */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Extra Items
        </h2>

        {adHocItems.length > 0 && (
          <ul className="mb-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {adHocItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-3"
                data-testid="adhoc-item"
              >
                <input
                  type="checkbox"
                  checked={item.checked === 1}
                  onChange={() =>
                    startTransition(async () => {
                      await toggleAdHocItem(item.id, item.checked !== 1);
                      router.refresh();
                    })
                  }
                  className="h-4 w-4 rounded accent-emerald-600"
                  aria-label={`Check off ${item.name}`}
                />
                <span
                  className={`flex-1 text-sm ${
                    item.checked === 1
                      ? "line-through text-zinc-400"
                      : "text-zinc-800"
                  }`}
                >
                  {item.name}
                </span>
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await removeAdHocItem(item.id);
                      router.refresh();
                    })
                  }
                  disabled={isPending}
                  className="text-zinc-400 hover:text-red-500 text-xs"
                  aria-label={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item…"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-testid="add-item-input"
          />
          <button
            type="submit"
            disabled={isPending || !newItem.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            data-testid="add-item-btn"
          >
            Add
          </button>
        </form>
      </section>

      {/* ── Pantry management ── */}
      <section>
        <button
          onClick={() => setShowPantry((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-600"
          data-testid="toggle-pantry-btn"
        >
          <span>{showPantry ? "▼" : "▶"}</span>
          Always in Stock ({pantryItems.length})
        </button>

        {showPantry && (
          <div className="mt-3 space-y-3">
            {pantryItems.length > 0 && (
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
                {pantryItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2"
                    data-testid="pantry-item"
                  >
                    <span className="flex-1 text-sm text-zinc-700">
                      {item.name}
                    </span>
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await removePantryItem(item.id);
                          router.refresh();
                        })
                      }
                      disabled={isPending}
                      className="text-zinc-400 hover:text-red-500 text-xs"
                      aria-label={`Remove ${item.name} from pantry`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddPantry} className="flex gap-2">
              <input
                type="text"
                value={newPantry}
                onChange={(e) => setNewPantry(e.target.value)}
                placeholder="Add pantry item…"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                data-testid="add-pantry-input"
              />
              <button
                type="submit"
                disabled={isPending || !newPantry.trim()}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                data-testid="add-pantry-btn"
              >
                Add
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
