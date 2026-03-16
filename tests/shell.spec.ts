import { test, expect } from "@playwright/test";

test.describe("story_08 — App Shell & Bottom Nav", () => {
  test("shell loads and all four nav tabs are present and routable", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Meal Prep Assistant/i);

    const nav = page.getByRole("navigation", { name: "bottom navigation" });
    await expect(nav).toBeVisible();

    const tabs = [
      { name: /Recipes/i, url: "/recipes" },
      { name: /Plan/i, url: "/plan" },
      { name: /Shopping/i, url: "/shopping" },
      { name: /Prep/i, url: "/prep" },
    ];

    for (const { name, url } of tabs) {
      await nav.getByRole("link", { name }).click({ force: true });
      await expect(page).toHaveURL(url);
    }
  });

  test("shell renders on mobile viewport (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "bottom navigation" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /Recipes/i })).toBeInViewport();
    await expect(nav.getByRole("link", { name: /Plan/i })).toBeInViewport();
    await expect(nav.getByRole("link", { name: /Shopping/i })).toBeInViewport();
    await expect(nav.getByRole("link", { name: /Prep/i })).toBeInViewport();
  });
});
