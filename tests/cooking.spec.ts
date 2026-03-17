import { test, expect } from "@playwright/test";

/**
 * E2E: Phase-Based Step Categorization cooking journey.
 *
 * Tests run against the live dev server. The dev DB (local.db) may or may
 * not have recipes. Tests are structured to gracefully handle both states.
 */
test.describe("Cooking UI — user journey", () => {
  test("prep page renders with a heading", async ({ page }) => {
    await page.goto("/prep");
    // Use .first() because /prep page now has multiple headings matching /prep/i
    // (main h1 "Prep", "Prep Sessions" section h2, "New Prep Session" form h3)
    await expect(
      page.getByRole("heading", { name: /prep/i }).first()
    ).toBeVisible();
  });

  test("prep page shows cook links or an empty state", async ({ page }) => {
    await page.goto("/prep");
    await page.waitForLoadState("networkidle");

    const cookLinks = page.getByTestId("cook-link");
    const emptyState = page.getByTestId("prep-empty-state");
    await expect(cookLinks.or(emptyState).first()).toBeVisible();
  });

  test("navigating to a non-existent recipe shows not-found state", async ({
    page,
  }) => {
    await page.goto("/prep/cook/999999");
    await expect(page.getByTestId("recipe-not-found")).toBeVisible();
  });

  test("cooking page shows prep checklist then reveals active steps", async ({
    page,
  }) => {
    // Ensure at least one recipe exists by seeding from TheMealDB
    await page.goto("/recipes");

    // Seed a recipe (idempotent — duplicates are rejected by externalId UNIQUE)
    const seedBtn = page.getByRole("button", { name: /seed from themealdb/i });
    await seedBtn.click({ force: true });

    // Wait for the seed to resolve — either a new card or an existing one
    await expect(page.getByTestId("recipe-card").first()).toBeVisible({
      timeout: 20000,
    });

    // Find the first cook link on the prep page
    await page.goto("/prep");
    const firstCookLink = page.getByTestId("cook-link").first();
    await expect(firstCookLink).toBeVisible({ timeout: 10000 });
    await firstCookLink.click({ force: true });

    // Should be on the cook page
    await expect(page).toHaveURL(/\/prep\/cook\/\d+/);

    // Recipe title should be visible
    await expect(page.getByTestId("recipe-title")).toBeVisible();

    // Either the prep checklist or the active section renders
    const prepSection = page.getByTestId("prep-section");
    const activeSection = page.getByTestId("active-section");
    await expect(prepSection.or(activeSection).first()).toBeVisible();
  });

  test("skip prep button reveals active steps immediately", async ({
    page,
  }) => {
    // Ensure at least one recipe exists
    await page.goto("/recipes");
    const seedBtn = page.getByRole("button", { name: /seed from themealdb/i });
    await seedBtn.click({ force: true });

    // Wait for seed to complete
    await expect(page.getByTestId("recipe-card").first()).toBeVisible({
      timeout: 20000,
    });

    // Navigate to cook page via prep page
    await page.goto("/prep");
    const firstCookLink = page.getByTestId("cook-link").first();
    await expect(firstCookLink).toBeVisible({ timeout: 10000 });
    await firstCookLink.click({ force: true });

    // If there's a skip prep button (AI-parsed recipe with prep steps), click it
    const skipBtn = page.getByTestId("skip-prep-btn");
    if (await skipBtn.isVisible()) {
      await skipBtn.click({ force: true });
      // Active section should be visible after skipping prep
      await expect(page.getByTestId("active-section")).toBeVisible();
    } else {
      // TheMealDB recipes have no prep_steps → active section already visible
      await expect(page.getByTestId("active-section")).toBeVisible();
    }
  });

  test("prep page is accessible from the bottom nav", async ({ page }) => {
    await page.goto("/recipes");
    const prepLink = page.getByRole("link", { name: /prep/i }).first();
    await prepLink.click({ force: true });
    await expect(page).toHaveURL(/\/prep/);
    await expect(page.getByRole("heading", { name: /prep/i }).first()).toBeVisible();
  });
});
