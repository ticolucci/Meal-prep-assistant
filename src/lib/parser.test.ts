import { describe, it, expect } from "vitest";
import { parseAmount, normalizeIngredient } from "./parser";

describe("parseAmount", () => {
  it("parses a whole number", () => {
    expect(parseAmount("2")).toEqual({ amount: 2, unit: "" });
  });

  it("parses a decimal", () => {
    expect(parseAmount("1.5")).toEqual({ amount: 1.5, unit: "" });
  });

  it("parses a simple fraction", () => {
    expect(parseAmount("1/2")).toEqual({ amount: 0.5, unit: "" });
  });

  it("parses a mixed number", () => {
    expect(parseAmount("1 1/2")).toEqual({ amount: 1.5, unit: "" });
  });

  it("parses '3/4 cup'", () => {
    expect(parseAmount("3/4 cup")).toEqual({ amount: 0.75, unit: "cup" });
  });

  it("parses '2 tbsp'", () => {
    expect(parseAmount("2 tbsp")).toEqual({ amount: 2, unit: "tbsp" });
  });

  it("parses '200g'", () => {
    expect(parseAmount("200g")).toEqual({ amount: 200, unit: "g" });
  });

  it("parses '1 tsp'", () => {
    expect(parseAmount("1 tsp")).toEqual({ amount: 1, unit: "tsp" });
  });

  it("handles empty string", () => {
    expect(parseAmount("")).toEqual({ amount: null, unit: "" });
  });

  it("handles 'to taste'", () => {
    expect(parseAmount("to taste")).toEqual({ amount: null, unit: "to taste" });
  });

  it("handles 'pinch'", () => {
    expect(parseAmount("pinch")).toEqual({ amount: null, unit: "pinch" });
  });
});

describe("normalizeIngredient", () => {
  it("returns normalized ingredient with name, prep, amount, unit", () => {
    const result = normalizeIngredient("diced onion", "1/2 cup");
    expect(result.name).toBe("onion");
    expect(result.prep).toBe("diced");
    expect(result.amount).toBe(0.5);
    expect(result.unit).toBe("cup");
  });

  it("handles plain ingredient with no prep", () => {
    const result = normalizeIngredient("chicken", "200g");
    expect(result.name).toBe("chicken");
    expect(result.prep).toBeNull();
    expect(result.amount).toBe(200);
    expect(result.unit).toBe("g");
  });

  it("handles 'chopped garlic'", () => {
    const result = normalizeIngredient("chopped garlic", "3 cloves");
    expect(result.name).toBe("garlic");
    expect(result.prep).toBe("chopped");
    expect(result.amount).toBe(3);
    expect(result.unit).toBe("cloves");
  });

  it("handles empty measure", () => {
    const result = normalizeIngredient("salt", "");
    expect(result.name).toBe("salt");
    expect(result.amount).toBeNull();
    expect(result.unit).toBe("");
  });

  it("lowercases the name", () => {
    const result = normalizeIngredient("Flour", "1 cup");
    expect(result.name).toBe("flour");
  });

  it("extracts prep from suffix pattern 'ingredient, prep'", () => {
    const result = normalizeIngredient("chicken breast, sliced", "300g");
    expect(result.name).toBe("chicken breast");
    expect(result.prep).toBe("sliced");
  });
});
