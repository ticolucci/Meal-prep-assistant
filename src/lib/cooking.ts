/**
 * Parse a JSON-serialized string array from the database.
 * Returns an empty array for null, undefined, invalid JSON, or non-array values.
 */
export function parseSteps(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === "string");
  } catch {
    return [];
  }
}

/**
 * Returns true when the user has completed (or there are no) prep steps.
 * @param total  - Total number of prep steps for this recipe.
 * @param checked - Set of step indices the user has checked off.
 */
export function isPrepDone(total: number, checked: Set<number>): boolean {
  if (total === 0) return true;
  return checked.size >= total;
}
