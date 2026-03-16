# Testing Philosophy & Strategy

## The Target Pyramid

```
         ██             E2E (Playwright)     ~15%  critical user journeys
        ████            Integration (Vitest) ~25%  Server Actions + real DB
      ████████          Unit (Vitest)        ~60%  pure functions & mappers
```

All three layers run in CI. Fast feedback comes from the bottom up — run unit
tests first, integration second, E2E last.

---

## What to Mock — and What Not to

The guiding principle: **mock things that are impure by nature; test everything
local against the real thing.**

A useful mental model is the functional-programming "monad boundary": if a
dependency would need to be wrapped in an IO, Reader, or State monad to be
deterministic in a purely functional language, it is a candidate for mocking in
tests. Everything else should be tested against its real implementation.

### DO mock

| Dependency | Why |
|---|---|
| External HTTP (`fetch` to TheMealDB, Anthropic API, etc.) | Non-deterministic, requires network, can be rate-limited or change response |
| `Date.now()` / `new Date()` | Non-deterministic — use `vi.useFakeTimers()` |
| `Math.random()` | Non-deterministic — mock or seed explicitly |
| File-system paths outside the project | Environment-dependent |

Use `vi.stubGlobal('fetch', ...)` or MSW for HTTP, and `vi.useFakeTimers()` for
time. Keep mocks as thin as possible — return only the fields the code under
test actually reads.

### DO NOT mock

| Dependency | Why |
|---|---|
| The local SQLite database (`file:./test.db`) | Cheap to spin up, migrations run in milliseconds, testing against the real schema catches real bugs |
| Server Actions | They are just async functions — call them directly in tests |
| Internal query helpers (`src/db/queries.ts`, etc.) | Test the whole data layer together; mocking it only tests the mock |
| React components (in integration tests) | Render them against a real RSC or use `@testing-library/react` without mocking child components |

The only reason to mock a local dependency is if it is genuinely expensive
(e.g. a slow external service masquerading as a local module). That situation
has not arisen in this project.

---

## Test Database

Integration and unit tests that touch the DB use a dedicated local SQLite file:

```
TURSO_DATABASE_URL=file:./test.db
TURSO_AUTH_TOKEN=local
```

Setup (run once before the test suite via Vitest `globalSetup`):
1. Run `drizzle-kit migrate` against `test.db`.
2. Truncate all tables so each test file starts with a clean slate.

**Do not share state between test files.** Each file is responsible for
inserting its own data via factory functions (see below). Individual tests
within a file may share inserted rows if the setup cost is high, but document
this explicitly.

---

## Factory Functions

Live at `src/test/factories.ts`. Each factory inserts a row into `test.db` and
returns the inserted record (typed via Drizzle's `$inferSelect`).

```ts
// Example usage in a test
import { makeRecipe, makeIngredient } from "@/test/factories";

const recipe = await makeRecipe({ title: "Test Pasta" });
const ing    = await makeIngredient({ recipeId: recipe.id, name: "pasta" });
```

Rules:
- Factories set sensible defaults for every non-null column.
- Callers override only the fields relevant to the test.
- Factories never call external HTTP — they write directly to the DB.

---

## Layer Responsibilities

### Unit tests (`src/**/*.test.ts`)

Test pure functions in isolation. No DB, no HTTP, no Next.js runtime.

Good candidates:
- `extractIngredients(meal)` — TheMealDB response mapper
- `aggregateIngredients(recipes[])` — shopping list aggregation (story_03)
- `batchPrepTasks(menu)` — prep batching engine (story_05)
- Ingredient normalisation / amount parsing (story_01)

Rule: **if the function takes data in and returns data out with no side effects,
it must have unit tests.**

### Integration tests (`src/**/*.integration.test.ts`)

Test Server Actions and query helpers against the real `test.db`. Mock only
external HTTP.

```ts
// Example: seeding action integration test
vi.stubGlobal("fetch", async () => ({
  ok: true,
  json: async () => ({ meals: [FIXTURE_MEAL] }),
}));

const result = await seedRecipes();
const rows = await db.select().from(recipes);
expect(rows).toHaveLength(1);
expect(rows[0].title).toBe(FIXTURE_MEAL.strMeal);
```

### E2E tests (`tests/*.spec.ts`)

Playwright browser tests. Reserve for critical **user journeys**, not logic
assertions:

- "User can seed a recipe and see it on the recipes page."
- "User can generate a meal plan and approve it."
- "Seed button shows a loading state while the action is pending."

Do **not** use Playwright to assert exact ingredient counts, DB row counts, or
business-logic outcomes — that is integration test territory.

---

## npm Scripts

```json
"test:unit": "vitest run",
"test:e2e":  "playwright test",
"test":      "vitest run && playwright test"
```

Run `test:unit` during development for fast feedback. Run `test` in CI.

---

## Project-Specific Gotchas

These are not general Playwright/Vitest advice — they are lessons specific to this codebase.

### `vi.stubGlobal` must come before the module import

Server Actions that call `fetch` (e.g. `parseRecipeText`) capture the `fetch` reference at module load time. Stubbing after import has no effect.

```ts
// ✓ Correct
vi.stubGlobal("fetch", myMock);
const { parseRecipeText } = await import("./parse-recipe"); // dynamic import after stub
```

### Integration test cleanup order

Delete in FK-safe order (children before parents) in `beforeEach`:

```ts
await db.delete(mealPlanRecipes);
await db.delete(mealPlans);
await db.delete(recipeIngredients);
await db.delete(recipes);
// pantry_items and shopping_list_extra have no FK dependencies
```

### E2E: submit forms with `press("Enter")`, not force-click on the button

`click({ force: true })` on a `<button type="submit">` does **not** reliably trigger the parent `<form>`'s `onSubmit` handler in Playwright.

```ts
// ✗ Unreliable
await page.getByRole("button", { name: "Submit" }).click({ force: true });

// ✓ Reliable
await page.getByTestId("my-input").press("Enter");
```

### E2E: don't use `networkidle` on pages with outbound HTTP

`waitForLoadState("networkidle")` times out when the page makes external HTTP calls (e.g. TheMealDB image loads). Wait for a specific visible element instead:

```ts
// ✗ Times out
await page.waitForLoadState("networkidle");

// ✓ Reliable
await page.getByTestId("recipe-card").first().waitFor();
```

### E2E: nav link clicks need `{ force: true }` on mobile viewport

The Next.js dev overlay (`nextjs-portal`) intercepts pointer events at the bottom of the viewport on narrow screens, blocking bottom nav clicks. Dev-mode artifact only — not a production issue.

```ts
await page.getByRole("link", { name: "Shopping" }).click({ force: true });
```

---

## Known Pre-Existing Test Failures

Do **not** investigate these when implementing new stories — they are pre-existing.

| Test | File | Root Cause |
|------|------|------------|
| `"user can generate, swap, and approve a meal plan"` | `tests/meal-plan.spec.ts:33` | `MealPlanClient` uses `window.location.reload()`, which resets React state before the badge assertion. Fix: migrate to `router.refresh()`. |
| `"Plan tab routes to /plan"` | `tests/shell.spec.ts:35` | Intermittent timing issue in the full Playwright suite; passes in isolation. No app code change needed. |
