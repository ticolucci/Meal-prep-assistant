import { describe, it, expect } from "vitest";
import { parseSteps, isPrepDone } from "./cooking";

describe("parseSteps", () => {
  it("returns empty array for null", () => {
    expect(parseSteps(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parseSteps(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseSteps("")).toEqual([]);
  });

  it("parses a valid JSON string array", () => {
    expect(parseSteps('["Dice onion","Mince garlic"]')).toEqual([
      "Dice onion",
      "Mince garlic",
    ]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseSteps("not-json")).toEqual([]);
  });

  it("returns empty array when JSON is not an array", () => {
    expect(parseSteps('{"step":"dice"}')).toEqual([]);
  });

  it("filters out non-string array elements", () => {
    expect(parseSteps('[1, "Dice onion", null, "Mince garlic"]')).toEqual([
      "Dice onion",
      "Mince garlic",
    ]);
  });
});

describe("isPrepDone", () => {
  it("returns true when there are no prep steps (total=0)", () => {
    expect(isPrepDone(0, new Set())).toBe(true);
  });

  it("returns false when no steps are checked", () => {
    expect(isPrepDone(3, new Set())).toBe(false);
  });

  it("returns false when only some steps are checked", () => {
    expect(isPrepDone(3, new Set([0, 1]))).toBe(false);
  });

  it("returns true when all steps are checked", () => {
    expect(isPrepDone(3, new Set([0, 1, 2]))).toBe(true);
  });
});
