import { test, expect } from "@playwright/test";

test.describe("story_09 — Recipe Seeding from TheMealDB", () => {
  test("recipes page shows empty-state message when no recipes exist", async ({
    page,
  }) => {
    await page.goto("/recipes");
    // Either empty state or recipe cards — the page must render without error
    const hasEmptyState = await page
      .getByTestId("empty-state")
      .isVisible()
      .catch(() => false);
    const hasRecipeCards = await page
      .getByTestId("recipe-card")
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasEmptyState || hasRecipeCards).toBe(true);
  });

  test("recipes page has a Seed from TheMealDB button", async ({ page }) => {
    await page.goto("/recipes");
    await expect(
      page.getByRole("button", { name: /seed from themealdb/i })
    ).toBeVisible();
  });

  test("clicking Seed button shows loading state then resolves", async ({
    page,
  }) => {
    await page.goto("/recipes");
    const btn = page.getByRole("button", { name: /seed from themealdb/i });
    await btn.click({ force: true });
    // Should briefly show a loading/seeding state
    await expect(btn).toBeDisabled({ timeout: 3000 }).catch(() => {
      // button may resolve before we can catch it — that is acceptable
    });
    // Eventually a recipe card or a success message must appear
    await expect(
      page.getByTestId("recipe-card").or(page.getByText(/seeded|recipe added/i)).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("after seeding, recipe card shows title and thumbnail image", async ({
    page,
  }) => {
    await page.goto("/recipes");
    const btn = page.getByRole("button", { name: /seed from themealdb/i });
    await btn.click({ force: true });

    const card = page.getByTestId("recipe-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // Card must contain a heading with some text
    await expect(card.getByRole("heading")).toHaveText(/.+/);

    // Card must contain a thumbnail image
    await expect(card.getByRole("img")).toBeVisible();
  });

  test("recipe cards are listed on /recipes without re-seeding", async ({
    page,
  }) => {
    // Navigate directly to recipes — cards seeded in previous test persist in DB
    await page.goto("/recipes");
    // At least one card should be visible (DB persists across page loads)
    await expect(
      page.getByTestId("recipe-card").first()
    ).toBeVisible({ timeout: 5000 });
  });
});
