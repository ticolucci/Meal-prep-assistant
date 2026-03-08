import Link from "next/link";
import RecipeImportForm from "@/components/RecipeImportForm";

export default function RecipeImportPage() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/recipes"
          className="text-zinc-400 hover:text-zinc-600 transition"
          aria-label="Back to recipes"
        >
          ←
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Import Recipe
        </h1>
      </div>

      <p className="text-sm text-zinc-500 mb-6">
        Paste a recipe URL or the full recipe text. The AI will extract the
        title, ingredients, prep steps, and active cooking steps automatically.
      </p>

      <RecipeImportForm />
    </div>
  );
}
