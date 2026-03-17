import { test, expect } from "@playwright/test";

test.describe("story_01b — Editable AI Recipe Review UI", () => {
  test("import page loads with textarea and submit button", async ({ page }) => {
    await page.goto("/recipes/import");
    await expect(page.getByTestId("recipe-input")).toBeVisible();
    await expect(page.getByTestId("import-submit")).toBeVisible();
  });

  test("submit button is disabled when textarea is empty", async ({ page }) => {
    await page.goto("/recipes/import");
    await expect(page.getByTestId("import-submit")).toBeDisabled();
  });

  test("submit button is enabled when textarea has text", async ({ page }) => {
    await page.goto("/recipes/import");
    await page.getByTestId("recipe-input").fill("Some recipe text");
    await expect(page.getByTestId("import-submit")).toBeEnabled();
  });

  test("shows error when API key is not configured or call fails", async ({
    page,
  }) => {
    // In the test environment the API call will fail (no real Anthropic key).
    // We verify the UI handles the error gracefully.
    await page.goto("/recipes/import");
    await page.getByTestId("recipe-input").fill("Test recipe content here");
    // Click the submit button (textarea.press("Enter") only inserts a newline)
    await page.getByTestId("import-submit").click({ force: true });
    // Wait for either an error message or the review panel — one must appear
    const errorOrReview = page
      .getByTestId("import-error")
      .or(page.getByTestId("review-panel"));
    await errorOrReview.first().waitFor({ timeout: 15000 });
  });
});
