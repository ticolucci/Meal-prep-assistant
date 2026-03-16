# Architecture & Data Model

## Page Pattern: RSC + Client Component Split

Every page in this app follows the same structure:

```
src/app/<route>/page.tsx          ← React Server Component (force-dynamic)
                                     Fetches from DB, passes data as props
src/components/<Name>Client.tsx   ← "use client" component
                                     Handles all interactivity, calls Server Actions
```

The RSC never handles events. The client component never queries the DB directly.

**Critical:** every page that reads from the DB must export:
```ts
export const dynamic = "force-dynamic";
```
Without this, Next.js statically renders at build time and the page always shows empty data.

## Navigation

- Root `/` redirects to `/recipes` via `next/navigation` `redirect()`
- Four tabs: `/recipes`, `/plan`, `/shopping`, `/prep`
- `src/components/BottomNav.tsx` is `"use client"`, uses `usePathname()` to set active state (`aria-current="page"` + `text-emerald-600`)
- `src/app/layout.tsx` wraps all content with `<main className="pb-16">` to clear the fixed `h-16` nav bar

---

## Database Schema

All tables are defined in `src/db/schema.ts`. Migrations live in `drizzle/migrations/`.

Schema grows incrementally — never add columns or tables speculatively. When a story needs persistence, extend `schema.ts` with only what that story requires, then run:

```sh
npx drizzle-kit generate   # creates the migration file
npx drizzle-kit migrate    # applies it to the DB
```

### `recipes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `external_id` | text UNIQUE | TheMealDB ID; null for AI-imported recipes |
| `title` | text NOT NULL | |
| `image_url` | text | |
| `instructions` | text | Raw TheMealDB instructions — used as fallback if `prep_steps`/`active_steps` are empty |
| `source` | text | `"themealdb"` or `"ai"` |
| `prep_steps` | text | JSON-serialized `string[]`, e.g. `'["Dice onion","Mince garlic"]'`. **NULL for TheMealDB-seeded rows.** |
| `active_steps` | text | Same format. NULL for TheMealDB rows. |
| `prep_minutes` | integer | NULL for all current rows (TheMealDB doesn't expose it) |
| `created_at` | integer | Unix timestamp |

Always read `prep_steps`/`active_steps` through `parseSteps()` from `src/lib/cooking.ts` — it handles null and invalid JSON safely.

### `recipe_ingredients`

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `recipe_id` | integer FK → recipes.id | |
| `name` | text | Normalised ingredient name |
| `measure` | text | Raw measure string from TheMealDB |
| `amount` | real | Parsed numeric amount — **null for TheMealDB rows** |
| `unit` | text | Parsed unit string — **null for TheMealDB rows** |
| `prep` | text | Prep state e.g. `"diced"`, `"minced"` — **null for TheMealDB rows** |

> `amount`, `unit`, and `prep` are only populated for AI-parsed recipes (story_01). This means shopping list aggregation and prep batching only work well once AI-parsed recipes are in the DB.

### `meal_plans`

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `status` | text | `'draft'` or `'approved'` |
| `meal_count` | integer | |
| `params` | text | JSON blob of planner parameters |
| `created_at` | integer | Unix timestamp |

Query pattern for the current approved plan:
```ts
db.select().from(mealPlans)
  .where(eq(mealPlans.status, "approved"))
  .orderBy(desc(mealPlans.createdAt), desc(mealPlans.id))
  .limit(1)
```
The `id DESC` tiebreaker handles the case where two plans share the same `unixepoch()` timestamp.

### `meal_plan_recipes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `plan_id` | integer FK → meal_plans.id | |
| `recipe_id` | integer FK → recipes.id | |
| `position` | integer | Display order |

### `pantry_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `name` | text UNIQUE | Matched case-insensitively against ingredient names |
| `created_at` | integer | |

### `shopping_list_extra`

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `name` | text | Ad-hoc item name |
| `checked` | integer | `0` or `1` (SQLite has no boolean) |
| `created_at` | integer | |

---

## Data Flow: Weekly Prep Workflow

```
Import Recipe (story_01)
  → parseRecipeText() calls Anthropic Claude Haiku
  → saves to recipes + recipe_ingredients (with amount/unit/prep populated)

Generate Plan (story_02)
  → selectMealPlan(allRecipes, params) — pure function, greedy overlap
  → writes meal_plans (status='draft') + meal_plan_recipes rows

Approve Plan (story_02)
  → meal_plans.status = 'approved'

Shopping List (story_03)
  → latest approved plan → its recipe_ingredients
  → aggregateIngredients() groups by (name, unit), sums amounts
  → subtractPantry() filters out pantry_items
  → categorizeIngredient() assigns aisle group

Prep Page (story_04 + story_05)
  → latest approved plan's recipes (falls back to ALL recipes if none approved)
  → batchPrepTasks() groups (name, prep) pairs spanning 2+ recipes
  → Cook link → /prep/cook/[id] → CookingClient shows prep checklist first,
    active steps locked until prep is done (or "Skip Prep" is clicked)
```

---

## Key Design Decisions

### `prep_steps`/`active_steps` stored as TEXT, not a separate table

These columns hold JSON-serialized string arrays in the `recipes` row. Rationale: they are always read and written together with the recipe; a separate table would add joins with no query-time benefit. Always read via `parseSteps()` which handles null/invalid JSON.

### Planner algorithm is greedy by design

Finding the truly optimal recipe set to minimise unique ingredients is NP-hard. The greedy approach — sort candidates by ingredient overlap with already-selected meals — is fast and deterministic for a DB of <100 recipes. Determinism is enforced by sorting the candidate pool by `id` before the greedy loop so identical inputs always produce identical outputs.

### `router.refresh()` over `window.location.reload()`

In App Router client components, `router.refresh()` re-fetches RSC data without a full browser navigation, preserving React client state (e.g. open/closed sections). `window.location.reload()` resets all `useState`.

**Note:** `MealPlanClient` still uses `window.location.reload()` — this is a known issue tracked in `docs/testing.md`.
