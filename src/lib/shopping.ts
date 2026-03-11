import type { RecipeIngredient } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AggregatedIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
  category: string;
}

// ─── Category mapping ─────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Produce: [
    "onion", "garlic", "tomato", "potato", "carrot", "celery", "pepper",
    "spinach", "lettuce", "cucumber", "zucchini", "broccoli", "cauliflower",
    "mushroom", "eggplant", "avocado", "lime", "lemon", "apple", "banana",
    "berry", "strawberry", "blueberry", "grape", "mango", "pineapple",
    "pear", "peach", "plum", "cherry", "melon", "watermelon", "cabbage",
    "kale", "arugula", "cilantro", "parsley", "basil", "mint", "thyme",
    "rosemary", "sage", "dill", "chive", "scallion", "leek", "fennel",
    "beetroot", "beet", "turnip", "radish", "corn", "pea", "bean",
    "asparagus", "artichoke", "ginger", "jalapeño", "chilli", "chili",
  ],
  Meat: [
    "chicken", "beef", "pork", "lamb", "turkey", "duck", "veal", "venison",
    "bacon", "ham", "sausage", "chorizo", "pepperoni", "prosciutto", "salami",
    "mince", "ground beef", "ground pork", "steak", "rib", "brisket",
    "tenderloin", "sirloin", "fillet",
  ],
  Dairy: [
    "milk", "butter", "cheese", "cream", "yogurt", "egg", "eggs",
    "sour cream", "cheddar", "mozzarella", "parmesan", "ricotta",
    "cottage cheese", "brie", "gouda", "feta", "cream cheese",
    "half and half", "heavy cream", "whipped cream", "ghee",
  ],
  Seafood: [
    "salmon", "tuna", "cod", "shrimp", "prawn", "lobster", "crab",
    "oyster", "mussel", "clam", "scallop", "squid", "octopus",
    "tilapia", "halibut", "trout", "anchovy", "sardine", "mackerel",
    "sea bass", "snapper", "catfish",
  ],
  Bakery: [
    "bread", "baguette", "roll", "bun", "croissant", "muffin", "bagel",
    "pita", "tortilla", "wrap", "naan", "focaccia",
  ],
  Frozen: [
    "frozen pea", "frozen corn", "frozen berry", "frozen meal",
    "frozen spinach", "frozen broccoli",
  ],
  Pantry: [
    "oil", "olive oil", "vegetable oil", "coconut oil", "sesame oil",
    "flour", "sugar", "salt", "pepper", "spice", "cumin", "paprika",
    "turmeric", "coriander", "cinnamon", "nutmeg", "cardamom", "clove",
    "bay leaf", "oregano", "vinegar", "balsamic", "soy sauce", "fish sauce",
    "oyster sauce", "hot sauce", "worcestershire", "ketchup", "mustard",
    "mayonnaise", "tomato paste", "tomato sauce", "coconut milk",
    "broth", "stock", "bouillon", "honey", "maple syrup", "molasses",
    "rice", "pasta", "noodle", "lentil", "chickpea", "black bean",
    "kidney bean", "can", "canned", "oat", "quinoa", "couscous",
    "breadcrumb", "cornstarch", "baking powder", "baking soda",
    "yeast", "vanilla", "cocoa", "chocolate", "peanut butter",
    "jam", "jelly", "dried", "powder", "extract",
  ],
};

/**
 * Maps an ingredient name to a supermarket category.
 * Pure function — no side effects.
 */
export function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return "Other";
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Aggregates a flat list of recipe ingredients, summing identical items
 * (same name + unit, case-insensitive). Returns a sorted list grouped by
 * category then name.
 *
 * Pure function — no side effects, no DB calls.
 */
export function aggregateIngredients(
  ingredients: RecipeIngredient[]
): AggregatedIngredient[] {
  // Group by (normalizedName, unit)
  const map = new Map<string, AggregatedIngredient>();

  for (const ing of ingredients) {
    const normalizedName = ing.name.toLowerCase().trim();
    const unit = ing.unit ?? null;
    const key = `${normalizedName}::${unit ?? "__null__"}`;

    if (map.has(key)) {
      const existing = map.get(key)!;
      if (ing.amount != null) {
        existing.amount = (existing.amount ?? 0) + ing.amount;
      }
    } else {
      map.set(key, {
        name: normalizedName,
        amount: ing.amount ?? null,
        unit,
        category: categorizeIngredient(normalizedName),
      });
    }
  }

  const result = Array.from(map.values());

  // Sort by category, then name
  result.sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    if (catCmp !== 0) return catCmp;
    return a.name.localeCompare(b.name);
  });

  return result;
}

// ─── Pantry subtraction ───────────────────────────────────────────────────────

/**
 * Removes items that are in the pantry from the aggregated list.
 * Pure function — no side effects.
 */
export function subtractPantry(
  aggregated: AggregatedIngredient[],
  pantryNames: string[]
): AggregatedIngredient[] {
  const pantrySet = new Set(pantryNames.map((n) => n.toLowerCase().trim()));
  return aggregated.filter((item) => !pantrySet.has(item.name.toLowerCase().trim()));
}
