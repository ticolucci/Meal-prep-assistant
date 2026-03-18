import { test, expect } from "@playwright/test";

/**
 * E2E: User Risk Disclosure & System Capabilities (story_11).
 *
 * The ConsentGate component wraps the Shopping page. On first visit, it
 * shows a consent screen. After the user accepts, the consent is persisted
 * in localStorage and is not shown again.
 */

test.describe("Consent Gate — Shopping page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root and clear localStorage so each test starts fresh.
    // Using page.evaluate (not addInitScript) avoids clearing localStorage
    // again on subsequent reloads within the same test.
    await page.goto("/");
    await page.evaluate(() =>
      localStorage.removeItem("automationConsentAccepted")
    );
  });

  test("first visit to /shopping shows consent screen", async ({ page }) => {
    await page.goto("/shopping");
    await expect(
      page.getByTestId("consent-screen")
    ).toBeVisible();
  });

  test("consent screen contains key disclaimer content", async ({ page }) => {
    await page.goto("/shopping");
    const screen = page.getByTestId("consent-screen");
    await expect(screen).toBeVisible();

    // Must mention automation
    await expect(screen.getByText(/automates/i)).toBeVisible();

    // Must mention what it does NOT do (no orders / no credentials)
    await expect(
      screen.getByText(/does not|never|will not/i).first()
    ).toBeVisible();

    // Must explain user responsibility
    await expect(screen.getByText(/responsible/i)).toBeVisible();

    // Personal tool disclaimer
    await expect(screen.getByText(/personal/i).first()).toBeVisible();
  });

  test("accept button hides consent screen and shows shopping content", async ({
    page,
  }) => {
    await page.goto("/shopping");
    await expect(page.getByTestId("consent-screen")).toBeVisible();

    await page.getByTestId("consent-accept-btn").click();

    // Consent screen should disappear
    await expect(page.getByTestId("consent-screen")).not.toBeVisible();

    // Shopping list content should now be visible
    await expect(
      page.getByRole("heading", { name: /shopping list/i })
    ).toBeVisible();
  });

  test("consent persists across page reloads", async ({ page }) => {
    await page.goto("/shopping");
    await page.getByTestId("consent-accept-btn").click();
    await expect(page.getByTestId("consent-screen")).not.toBeVisible();

    // Reload — should NOT show consent screen again
    await page.reload();
    await expect(page.getByTestId("consent-screen")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: /shopping list/i })
    ).toBeVisible();
  });

  test("consent screen has a link to the settings/system capabilities page", async ({
    page,
  }) => {
    await page.goto("/shopping");
    await expect(page.getByTestId("consent-screen")).toBeVisible();
    const settingsLink = page.getByTestId("consent-settings-link");
    await expect(settingsLink).toBeVisible();
    // Link should point to /settings
    await expect(settingsLink).toHaveAttribute("href", "/settings");
  });
});

test.describe("Settings page — System Capabilities", () => {
  test("settings page renders system capabilities section", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /system capabilities/i })
    ).toBeVisible();
  });

  test("settings page explains what the tool automates", async ({ page }) => {
    await page.goto("/settings");
    // Should describe automation
    await expect(page.getByText(/automat/i).first()).toBeVisible();
    // Should describe what it does NOT do
    await expect(page.getByText(/does not|never|will not/i).first()).toBeVisible();
    // Should describe user responsibility (review cart before confirming)
    await expect(page.getByText(/review/i).first()).toBeVisible();
  });

  test("settings page has a back/return link", async ({ page }) => {
    await page.goto("/settings");
    const backLink = page.getByTestId("settings-back-link");
    await expect(backLink).toBeVisible();
  });
});
