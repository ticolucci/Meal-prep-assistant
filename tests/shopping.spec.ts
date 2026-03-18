import { test, expect } from "@playwright/test";

/**
 * E2E: critical user journey for the Smart Shopping List.
 *
 * Tests run against the live dev server sharing local.db, so we cannot
 * guarantee DB state (e.g. whether an approved plan exists). Tests focus
 * on structure and user interactions rather than exact data assertions.
 */
test.describe("Shopping List — user journey", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-accept the automation consent so the shopping list is visible.
    // Consent is gated by localStorage; set it before navigating to /shopping.
    await page.goto("/");
    await page.evaluate(() =>
      localStorage.setItem("automationConsentAccepted", "true")
    );
  });

  test("shopping page renders without error", async ({ page }) => {
    await page.goto("/shopping");
    await expect(
      page.getByRole("heading", { name: /shopping list/i })
    ).toBeVisible();
    // Either shows no-plan message or the add-item form — both valid states
    const noPlan = page.getByTestId("no-plan-message");
    const addInput = page.getByTestId("add-item-input");
    await expect(noPlan.or(addInput).first()).toBeVisible();
  });

  test("user can add an ad-hoc item to the list", async ({ page }) => {
    await page.goto("/shopping");
    await page.waitForLoadState("networkidle");

    const input = page.getByTestId("add-item-input");
    await expect(input).toBeVisible();

    // Use a unique name to avoid conflicts with previous test runs
    const itemName = `e2e-item-${Date.now()}`;
    await input.fill(itemName);
    // Submit via Enter key — more reliable than force-clicking a submit button
    await input.press("Enter");

    // Wait for the RSC refresh (router.refresh) to complete and update the DOM
    await expect(
      page.getByTestId("adhoc-item").filter({ hasText: itemName }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("user can expand pantry section, add a pantry item, and see it listed", async ({
    page,
  }) => {
    await page.goto("/shopping");
    await page.waitForLoadState("networkidle");

    // Expand pantry section
    const toggleBtn = page.getByTestId("toggle-pantry-btn");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click({ force: true });

    const pantryInput = page.getByTestId("add-pantry-input");
    await expect(pantryInput).toBeVisible();

    const pantryName = `e2e-pantry-${Date.now()}`;
    await pantryInput.fill(pantryName);
    // Submit via Enter — router.refresh() keeps client state so pantry stays open
    await pantryInput.press("Enter");

    // Wait for the RSC re-render
    await expect(
      page.getByTestId("pantry-item").filter({ hasText: pantryName }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("shopping page is accessible from the bottom nav", async ({ page }) => {
    await page.goto("/recipes");
    const shoppingLink = page
      .getByRole("link", { name: /shopping/i })
      .first();
    await shoppingLink.click({ force: true });
    await expect(page).toHaveURL(/\/shopping/);
    await expect(
      page.getByRole("heading", { name: /shopping list/i })
    ).toBeVisible();
  });
});
