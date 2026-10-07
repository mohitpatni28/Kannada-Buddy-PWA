import { test, expect } from "@playwright/test";

test("source page separates original reuse terms from source obligations", async ({ page }) => {
  await page.goto("/sources");
  const original = page.locator("article").filter({ has: page.getByRole("heading", { name: "Manual curated phrases" }) });
  const imported = page.locator("article").filter({ has: page.getByRole("heading", { name: "Wikivoyage Kannada phrasebook" }) });
  await expect(original.getByText("CC BY-SA 4.0", { exact: true })).toBeVisible();
  await expect(original.getByRole("link", { name: "Open source" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
  await expect(imported.getByText(/LLM edits and human review retain source obligations/)).toBeVisible();
  await expect(page.getByText(/Content licensing does not certify native-speaker or audio review/)).toBeVisible();
});

test("mobile phrasebook finds provisional phrases by situation and preserves source links", async ({ page }) => {
  await page.goto("/phrasebook");
  await expect(page.getByRole("status")).toHaveText("100 course phrases");
  await expect(page.getByText("native reviewed", { exact: true })).toHaveCount(16);
  await expect(page.getByText("AI draft · native review pending", { exact: true })).toHaveCount(84);
  await page.getByRole("button", { name: "Phone calls", exact: true }).click();
  await expect(page.getByRole("button", { name: "Phone calls", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toHaveText("10 course phrases");
  await page.getByRole("searchbox", { name: "Search the course" }).fill("one moment");
  await expect(page.getByRole("status")).toHaveText("1 course phrase");
  await expect(page.getByText("One moment, please.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Wikivoyage", exact: true })).toHaveAttribute("href", /^https:\/\//);
  const attribution = page.getByRole("link", { name: "Attribution and changes", exact: true });
  await expect(attribution).toHaveAttribute("href", "/sources");
  expect((await page.request.get("/sources")).status()).toBe(200);
  await page.getByRole("searchbox").fill("no-such-course-item");
  await expect(page.getByText(/No matching course phrase/)).toBeVisible();
  await page.getByRole("searchbox").clear();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("100 course phrases");
});
