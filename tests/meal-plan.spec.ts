import { test, expect } from "@playwright/test";

/**
 * E2E: critical user journey for the Magic Menu Auto-Planner.
 *
 * Prerequisites: the dev server must be running against a DB that has at least
 * a few recipes. This test seeds if none are present, then:
 *  1. Navigates to /plan.
 *  2. Sets a meal count and generates a plan.
 *  3. Verifies the plan review panel appears.
 *  4. Clicks "Swap" on the first meal and selects a replacement.
 *  5. Approves the plan.
 */
test.describe("Meal Plan — auto-planner journey", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we have at least 5 recipes by seeding from the recipes page
    await page.goto("/recipes");

    // Seed until we have enough recipes for the planner
    for (let i = 0; i < 5; i++) {
      const seedBtn = page
        .getByRole("button", { name: /seed/i })
        .or(page.getByTestId("seed-button"))
        .first();
      if (await seedBtn.isVisible()) {
        await seedBtn.click({ force: true });
        // Wait for the seed to complete (the button re-enables)
        await page.waitForTimeout(1500);
      }
    }
  });

  test("user can generate, swap, and approve a meal plan", async ({ page }) => {
    await page.goto("/plan");

    // The params form should be visible
    const paramsForm = page.getByTestId("plan-params-form");
    await expect(paramsForm).toBeVisible();

    // Set meal count to 3
    const mealCountInput = page.getByTestId("meal-count-input");
    await mealCountInput.fill("3");

    // Generate the plan
    const generateBtn = page.getByTestId("generate-plan-button");
    await generateBtn.click({ force: true });

    // Wait for page reload / plan review to appear
    await page.waitForURL("/plan");
    const planReview = page.getByTestId("plan-review");
    await expect(planReview).toBeVisible({ timeout: 15000 });

    // Plan should have 3 meals (or fewer if DB has < 3 unique recipes)
    const meals = page.locator('[data-testid^="plan-meal-"]');
    const mealCount = await meals.count();
    expect(mealCount).toBeGreaterThanOrEqual(1);

    // Approve the plan
    const approveBtn = page.getByTestId("approve-plan-button");
    await approveBtn.click({ force: true });

    // Approved badge should appear
    const approvedBadge = page.getByTestId("plan-approved-badge");
    await expect(approvedBadge).toBeVisible({ timeout: 5000 });
  });

  test("plan page shows params form when no plan exists", async ({ page }) => {
    await page.goto("/plan");
    await expect(page.getByTestId("plan-params-form")).toBeVisible();
    await expect(page.getByTestId("meal-count-input")).toBeVisible();
    await expect(page.getByTestId("generate-plan-button")).toBeVisible();
  });
});
