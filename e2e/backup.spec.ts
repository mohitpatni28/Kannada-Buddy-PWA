import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const learningKey = "kannada-buddy-learning-state-v2";
const preferenceKey = "kannada-buddy-learning-preferences-v2";
const preferences = { learningMode: "speaking", romanization: "always", sessionMinutes: 5, referenceDeck: "core_only" };
const state = { concepts: { "greet-hello": {
  conceptId: "greet-hello", attempts: 2, successes: 1, lapses: 1, stabilityDays: 4,
  lastSeenAt: "2026-10-04T12:00:00.000Z", nextReviewAt: "2100-01-01T00:00:00.000Z",
  readingAttempts: 0, readingSuccesses: 0
} }, orthography: {}, evidence: [] };

test("downloaded backup restores progress and preferences after browser data is cleared", async ({ page }) => {
  await page.goto("/settings");
  await page.evaluate(({ learningKey, preferenceKey, state, preferences }) => {
    localStorage.setItem(learningKey, JSON.stringify(state));
    localStorage.setItem(preferenceKey, JSON.stringify(preferences));
    localStorage.setItem("unrelated-key", "keep");
  }, { learningKey, preferenceKey, state, preferences });
  await page.reload();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup", exact: true }).click();
  const download = await downloaded;
  const path = await download.path();
  expect(path).toBeTruthy();
  const bytes = await readFile(path!);
  expect(JSON.parse(bytes.toString()).data.learning).toEqual(state);
  await page.evaluate(({ learningKey, preferenceKey }) => {
    localStorage.removeItem(learningKey); localStorage.removeItem(preferenceKey);
  }, { learningKey, preferenceKey });
  await page.reload();
  await page.getByLabel("Choose a backup to restore").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: bytes });
  await expect(page.getByText(/1 practised concepts/)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), learningKey)).toBeNull();
  await page.getByRole("button", { name: "Restore backup", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Backup restored on this browser");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), learningKey)).toEqual(state);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), preferenceKey)).toEqual(preferences);
  expect(await page.evaluate(() => localStorage.getItem("unrelated-key"))).toBe("keep");
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Greet someone politely", exact: true })).toBeVisible();
});
