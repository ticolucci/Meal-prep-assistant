import { describe, it, expect } from "vitest";
import { extractIngredients } from "./themealdb";

describe("extractIngredients", () => {
  it("extracts ingredients with non-empty name and measure", () => {
    const meal = {
      idMeal: "1",
      strMeal: "Test",
      strMealThumb: "",
      strInstructions: "",
      strIngredient1: "Chicken",
      strMeasure1: "200g",
      strIngredient2: "Salt",
      strMeasure2: "1 tsp",
      strIngredient3: "",
      strMeasure3: "",
    };
    const result = extractIngredients(meal);
    expect(result).toEqual([
      { name: "Chicken", measure: "200g" },
      { name: "Salt", measure: "1 tsp" },
    ]);
  });

  it("returns empty array when no ingredients", () => {
    const meal = {
      idMeal: "1",
      strMeal: "Empty",
      strMealThumb: "",
      strInstructions: "",
    };
    expect(extractIngredients(meal)).toEqual([]);
  });

  it("trims whitespace from names and measures", () => {
    const meal = {
      idMeal: "1",
      strMeal: "Test",
      strMealThumb: "",
      strInstructions: "",
      strIngredient1: "  Onion  ",
      strMeasure1: " 1 cup  ",
    };
    const result = extractIngredients(meal);
    expect(result[0]).toEqual({ name: "Onion", measure: "1 cup" });
  });

  it("handles null/undefined fields gracefully", () => {
    const meal = {
      idMeal: "1",
      strMeal: "Test",
      strMealThumb: "",
      strInstructions: "",
      strIngredient1: "Garlic",
      strMeasure1: null,
      strIngredient2: null,
      strMeasure2: null,
    } as Record<string, string | null>;
    const result = extractIngredients(meal);
    expect(result).toEqual([{ name: "Garlic", measure: "" }]);
  });

  it("reads up to 20 ingredient slots", () => {
    const meal: Record<string, string | null> = {
      idMeal: "1",
      strMeal: "Test",
      strMealThumb: "",
      strInstructions: "",
    };
    for (let i = 1; i <= 20; i++) {
      meal[`strIngredient${i}`] = `Ingredient${i}`;
      meal[`strMeasure${i}`] = `${i}g`;
    }
    const result = extractIngredients(meal);
    expect(result).toHaveLength(20);
    expect(result[19]).toEqual({ name: "Ingredient20", measure: "20g" });
  });
});
