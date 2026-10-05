import { test, expect } from "@playwright/test";

test("mobile navigation, themes and zoom preserve task access", async ({ page }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ["/", "/travel", "/phrasebook", "/review", "/settings", "/library"]) {
        await page.goto(route);
        const nav = page.getByRole("navigation", { name: "Main navigation" });
        await expect(nav.getByRole("link")).toHaveCount(5);
        await expect(nav.locator("svg")).toHaveCount(5);
        await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${colorScheme} ${width}px ${route}`).toBe(true);
        expect(await page.locator('meta[name="viewport"]').getAttribute("content")).not.toContain("maximum-scale=1");
      }
    }
  }
  await page.goto("/travel");
  const icon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(icon).toBe("/icons/icon.svg");
  expect((await page.request.get(icon!)).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Prepare for your day" })).toBeVisible();
  await page.getByRole("link", { name: /Phone calls Find phrases/ }).click();
  await expect(page.getByRole("button", { name: "Phone calls", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Keyboard stage changes must put focus on the new learning content.
  await page.goto("/");
  await page.getByRole("button", { name: /Speak Kannada.*Choose speaking/ }).click();
  const reveal = page.getByRole("button", { name: "Reveal and compare", exact: true });
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".practice-answer h2")).toBeFocused();
});
