"use server";

import { db } from "@/db";
import { recipes, recipeIngredients } from "@/db/schema";
import { revalidatePath } from "next/cache";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are a recipe parsing assistant. Extract structured data from recipe text or a pasted URL content.

Return ONLY valid JSON matching this exact schema — no prose, no markdown fences:
{
  "title": string,
  "prep_steps": string[],
  "active_steps": string[],
  "ingredients": Array<{
    "name": string,
    "prep": string | null,
    "amount": number | null,
    "unit": string
  }>
}

Rules:
- "prep_steps" are tasks done before cooking starts: chopping, measuring, marinating.
- "active_steps" are tasks that require heat or active cooking: sautéing, boiling, baking.
- For each ingredient, "name" is the base ingredient (e.g. "onion"), "prep" is the preparation method (e.g. "diced"), "amount" is a decimal number, "unit" is the unit string.
- If no amount is specified, set "amount" to null.
- Normalize fractions (e.g. "1/2" → 0.5, "1 1/4" → 1.25).`;

export interface ParsedIngredient {
  name: string;
  prep: string | null;
  amount: number | null;
  unit: string;
}

export interface ParsedRecipe {
  title: string;
  prep_steps: string[];
  active_steps: string[];
  ingredients: ParsedIngredient[];
}

export interface ParseRecipeResult {
  success: boolean;
  message: string;
  recipeId?: number;
  parsed?: ParsedRecipe;
}

/**
 * Calls the Anthropic API to parse raw recipe text into structured data.
 * Does NOT save to the database — call saveRecipe() after the user reviews.
 */
export async function parseRecipeText(rawText: string): Promise<ParseRecipeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, message: "ANTHROPIC_API_KEY is not configured" };
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: rawText }],
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Anthropic API error: HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as ParsedRecipe;

    return { success: true, message: "Recipe parsed successfully", parsed };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to parse recipe",
    };
  }
}

export interface SaveRecipeResult {
  success: boolean;
  message: string;
  recipeId?: number;
}

/**
 * Saves a reviewed (and possibly edited) recipe to the database.
 * Called after the user has reviewed the AI-parsed output.
 */
export async function saveRecipe(data: ParsedRecipe): Promise<SaveRecipeResult> {
  try {
    const [inserted] = await db
      .insert(recipes)
      .values({
        title: data.title,
        instructions: data.active_steps.join("\n"),
        prepSteps: JSON.stringify(data.prep_steps),
        activeSteps: JSON.stringify(data.active_steps),
        source: "ai",
      })
      .returning({ id: recipes.id });

    if (data.ingredients.length > 0) {
      await db.insert(recipeIngredients).values(
        data.ingredients.map((ing) => ({
          recipeId: inserted.id,
          name: ing.name,
          prep: ing.prep,
          amount: ing.amount,
          unit: ing.unit ?? "",
          measure: ing.amount != null ? `${ing.amount} ${ing.unit}`.trim() : null,
        }))
      );
    }

    revalidatePath("/recipes");

    return {
      success: true,
      message: `Recipe "${data.title}" saved successfully`,
      recipeId: inserted.id,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save recipe",
    };
  }
}
