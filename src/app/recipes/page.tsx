export const dynamic = "force-dynamic";

import { db } from "@/db";
import { recipes } from "@/db/schema";
import { desc } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import SeedButton from "@/components/SeedButton";
import type { Recipe } from "@/db/schema";

async function getRecipes(): Promise<Recipe[]> {
  return db.select().from(recipes).orderBy(desc(recipes.createdAt));
}

export default async function RecipesPage() {
  const allRecipes = await getRecipes();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Recipes
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/recipes/import"
            data-testid="import-recipe-link"
            className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
          >
            + Import
          </Link>
          <SeedButton />
        </div>
      </div>

      {allRecipes.length === 0 ? (
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <p className="text-zinc-400 text-lg">No recipes yet.</p>
          <p className="text-zinc-400 text-sm mt-1">
            Tap &quot;Seed from TheMealDB&quot; to add your first recipe.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allRecipes.map((recipe) => (
            <li
              key={recipe.id}
              data-testid="recipe-card"
              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm"
            >
              {recipe.imageUrl && (
                <div className="relative h-48 w-full">
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2">
                  {recipe.title}
                </h2>
                {recipe.source === "themealdb" && (
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    TheMealDB
                  </span>
                )}
                {recipe.source === "ai" && (
                  <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                    AI Import
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
