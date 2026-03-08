/**
 * Prep word prefixes and suffixes used to extract the preparation method
 * from raw ingredient strings like "diced onion" or "chicken, sliced".
 */
const PREP_PREFIXES = [
  "diced",
  "chopped",
  "minced",
  "sliced",
  "grated",
  "crushed",
  "ground",
  "shredded",
  "peeled",
  "deseeded",
  "finely chopped",
  "roughly chopped",
  "finely diced",
  "thinly sliced",
  "coarsely chopped",
];

/**
 * Parses a measure string like "3/4 cup" or "200g" into a numeric amount and unit.
 * Returns { amount: null, unit: ... } when no numeric amount is found.
 * Pure function — no side effects.
 */
export function parseAmount(measure: string): { amount: number | null; unit: string } {
  const s = measure.trim();
  if (!s) return { amount: null, unit: "" };

  // Check for non-numeric qualitative measures first
  if (/^(to taste|pinch|handful|dash|splash|some|as needed)$/i.test(s)) {
    return { amount: null, unit: s };
  }

  // Pattern: optional (integer or decimal or fraction) then optional whitespace then unit
  // Supports: "1/2 cup", "1 1/2 cups", "200g", "3 tbsp", "2"
  const pattern = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z].*)?$/;
  const match = s.match(pattern);

  if (!match) {
    // No number found — treat entire string as unit
    return { amount: null, unit: s };
  }

  const numStr = match[1].trim();
  const unit = (match[2] ?? "").trim();

  let amount: number;

  if (numStr.includes(" ")) {
    // Mixed number e.g. "1 1/2"
    const [whole, frac] = numStr.split(" ");
    amount = parseInt(whole, 10) + evalFraction(frac);
  } else if (numStr.includes("/")) {
    // Simple fraction e.g. "3/4"
    amount = evalFraction(numStr);
  } else {
    amount = parseFloat(numStr);
  }

  return { amount, unit };
}

function evalFraction(frac: string): number {
  const [num, den] = frac.split("/").map(Number);
  return num / den;
}

export interface NormalizedIngredient {
  name: string;
  prep: string | null;
  amount: number | null;
  unit: string;
}

/**
 * Normalizes a raw ingredient name + measure into a structured record.
 * Extracts prep method from prefix ("diced onion" → prep: "diced", name: "onion")
 * or suffix with comma ("chicken breast, sliced" → name: "chicken breast", prep: "sliced").
 * Pure function — no side effects.
 */
export function normalizeIngredient(
  rawName: string,
  rawMeasure: string
): NormalizedIngredient {
  const { amount, unit } = parseAmount(rawMeasure);

  let name = rawName.toLowerCase().trim();
  let prep: string | null = null;

  // Suffix pattern: "ingredient, prep" — e.g. "chicken breast, sliced"
  const commaIdx = name.indexOf(",");
  if (commaIdx !== -1) {
    prep = name.slice(commaIdx + 1).trim() || null;
    name = name.slice(0, commaIdx).trim();
    return { name, prep, amount, unit };
  }

  // Prefix pattern: "prep ingredient" — check longest match first
  const sortedPrefixes = [...PREP_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    if (name.startsWith(prefix + " ")) {
      prep = prefix;
      name = name.slice(prefix.length + 1).trim();
      break;
    }
  }

  return { name, prep, amount, unit };
}
