"use client";

import { useTransition, useState } from "react";
import { seedRecipes } from "@/app/actions/seed";

export default function SeedButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSeed() {
    setMessage(null);
    startTransition(async () => {
      const result = await seedRecipes();
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleSeed}
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Seeding…" : "Seed from TheMealDB"}
      </button>
      {message && (
        <p className="text-sm text-zinc-500">{message}</p>
      )}
    </div>
  );
}
