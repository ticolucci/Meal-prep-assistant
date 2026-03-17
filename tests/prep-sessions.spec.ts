import { test, expect } from "@playwright/test";

/**
 * E2E: Custom Prep Session Builder (story_06).
 *
 * The Prep Sessions panel on /prep always shows the "Create New Session" form.
 * The batch tasks section and assign buttons only appear when there is an approved
 * plan with AI-parsed recipes (which have prep fields populated). TheMealDB-seeded
 * recipes have null prep fields, so batch tasks won't appear for them.
 *
 * These tests verify the structural UI and core user journey (create / delete session).
 * Assign-task flows are tested at the integration level.
 */
test.describe("Prep Sessions", () => {
  test("prep sessions section is always visible on /prep", async ({ page }) => {
    await page.goto("/prep");
    await expect(
      page.getByTestId("prep-sessions-section")
    ).toBeVisible();
  });

  test("create session form is visible with date and label inputs", async ({
    page,
  }) => {
    await page.goto("/prep");
    await expect(page.getByTestId("create-session-form")).toBeVisible();
    await expect(page.getByTestId("session-date-input")).toBeVisible();
    await expect(page.getByTestId("session-label-input")).toBeVisible();
    await expect(page.getByTestId("create-session-button")).toBeVisible();
  });

  test("shows validation error when trying to create a session without a date", async ({
    page,
  }) => {
    await page.goto("/prep");
    // Do not fill in the date — just click Create
    await page.getByTestId("create-session-button").click({ force: true });
    await expect(page.getByTestId("session-form-error")).toBeVisible();
    await expect(page.getByTestId("session-form-error")).toContainText(
      "Please choose a date"
    );
  });

  test("user can create a prep session and it appears on the page", async ({
    page,
  }) => {
    await page.goto("/prep");

    // Fill in the create session form
    const dateInput = page.getByTestId("session-date-input");
    await dateInput.fill("2026-03-22");

    const labelInput = page.getByTestId("session-label-input");
    await labelInput.fill("Sunday Batch Prep");

    // Submit
    await page.getByTestId("create-session-button").click({ force: true });

    // Wait for the new session card to appear
    await expect(page.getByTestId("prep-session").first()).toBeVisible({
      timeout: 10000,
    });

    // The session should show the label and date
    await expect(
      page.getByTestId("session-label").first()
    ).toContainText("Sunday Batch Prep");

    await expect(
      page.getByTestId("session-date").first()
    ).toContainText("2026-03-22");
  });

  test("new session shows 'No tasks assigned yet' message initially", async ({
    page,
  }) => {
    await page.goto("/prep");

    await page.getByTestId("session-date-input").fill("2026-03-23");
    await page.getByTestId("session-label-input").fill("Empty Session");
    await page.getByTestId("create-session-button").click({ force: true });

    await expect(page.getByTestId("prep-session").first()).toBeVisible({
      timeout: 10000,
    });

    await expect(
      page.getByTestId("session-no-tasks").first()
    ).toBeVisible();
  });

  test("user can delete a prep session", async ({ page }) => {
    await page.goto("/prep");

    // Create a session first
    await page.getByTestId("session-date-input").fill("2026-03-24");
    await page.getByTestId("session-label-input").fill("Session to Delete");
    await page.getByTestId("create-session-button").click({ force: true });

    // Wait for session to appear
    const session = page.getByTestId("prep-session").filter({
      hasText: "Session to Delete",
    });
    await expect(session).toBeVisible({ timeout: 10000 });

    // Delete it
    await session.getByTestId("delete-session-button").click({ force: true });

    // Session should be gone
    await expect(
      page.getByTestId("prep-session").filter({ hasText: "Session to Delete" })
    ).not.toBeVisible({ timeout: 10000 });
  });

  test("prep page with sessions still shows cook links without regression", async ({
    page,
  }) => {
    await page.goto("/prep");

    // Create a session to ensure sessions panel is populated
    await page.getByTestId("session-date-input").fill("2026-03-25");
    await page.getByTestId("create-session-button").click({ force: true });

    // Cook links should still be present (existing functionality not broken)
    const cookLinks = page.getByTestId("cook-link");
    const emptyState = page.getByTestId("prep-empty-state");
    await expect(cookLinks.or(emptyState).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
