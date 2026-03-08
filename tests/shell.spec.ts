import { test, expect } from "@playwright/test";

test.describe("story_08 — App Shell & Bottom Nav", () => {
  test("page title is Meal Prep Assistant", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Meal Prep Assistant/i);
  });

  test("bottom navigation bar is visible", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "bottom navigation" });
    await expect(nav).toBeVisible();
  });

  test("bottom nav has four tabs: Recipes, Plan, Shopping, Prep", async ({
    page,
  }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "bottom navigation" });
    await expect(nav.getByRole("link", { name: /Recipes/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Plan/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Shopping/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Prep/i })).toBeVisible();
  });

  test("Recipes tab routes to /recipes", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "bottom navigation" })
      .getByRole("link", { name: /Recipes/i })
      .click({ force: true });
    await expect(page).toHaveURL("/recipes");
  });

  test("Plan tab routes to /plan", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "bottom navigation" })
      .getByRole("link", { name: /Plan/i })
      .click({ force: true });
    await expect(page).toHaveURL("/plan");
  });

  test("Shopping tab routes to /shopping", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "bottom navigation" })
      .getByRole("link", { name: /Shopping/i })
      .click({ force: true });
    await expect(page).toHaveURL("/shopping");
  });

  test("Prep tab routes to /prep", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "bottom navigation" })
      .getByRole("link", { name: /Prep/i })
      .click({ force: true });
    await expect(page).toHaveURL("/prep");
  });

  test("active tab is visually highlighted on /recipes", async ({ page }) => {
    await page.goto("/recipes");
    const activeLink = page
      .getByRole("navigation", { name: "bottom navigation" })
      .getByRole("link", { name: /Recipes/i });
    // Active link should have an aria-current="page" attribute
    await expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  test("active tab is visually highlighted on /plan", async ({ page }) => {
    await page.goto("/plan");
    const activeLink = page
      .getByRole("navigation", { name: "bottom navigation" })
      .getByRole("link", { name: /Plan/i });
    await expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  test("active tab is visually highlighted on /shopping", async ({ page }) => {
    await page.goto("/shopping");
    const activeLink = page
      .getByRole("navigation", { name: "bottom navigation" })
      .getByRole("link", { name: /Shopping/i });
    await expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  test("active tab is visually highlighted on /prep", async ({ page }) => {
    await page.goto("/prep");
    const activeLink = page
      .getByRole("navigation", { name: "bottom navigation" })
      .getByRole("link", { name: /Prep/i });
    await expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  test("shell renders on mobile viewport (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "bottom navigation" });
    await expect(nav).toBeVisible();
    // All four tabs visible without horizontal scroll
    await expect(
      nav.getByRole("link", { name: /Recipes/i })
    ).toBeInViewport();
    await expect(nav.getByRole("link", { name: /Plan/i })).toBeInViewport();
    await expect(
      nav.getByRole("link", { name: /Shopping/i })
    ).toBeInViewport();
    await expect(nav.getByRole("link", { name: /Prep/i })).toBeInViewport();
  });
});
