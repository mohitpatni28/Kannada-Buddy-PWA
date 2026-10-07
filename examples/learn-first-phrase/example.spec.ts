import { expect, test } from "../fixtures";
import { orthographyUnits } from "../../data/orthography-units";

test("reveal a phrase and record a speaking attempt", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-06T12:00:00.000Z"));
  await page.goto("/");
  await page.getByRole("button", { name: /Speak Kannada.*Choose speaking/ }).click();
  await page.getByRole("button", { name: "Reveal and compare", exact: true }).click();
  await expect(page.locator(".practice-answer h2")).toBeVisible();
  await page.getByRole("button", { name: "Show Kannada script", exact: true }).click();
  await expect(page.locator(".practice-answer")).toContainText(/[\u0c80-\u0cff]/);
  await page.getByRole("button", { name: "Said it", exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kannada-buddy-learning-state-v2") ?? "{}"));
  expect(Object.keys(saved.concepts)).toHaveLength(1);
  expect(Object.values(saved.concepts)[0]).toMatchObject({ attempts: 1, successes: 1, nextReviewAt: "2026-10-10T12:00:00.000Z" });
  await page.goto("/review");
  await expect(page.locator(".stat-card").filter({ hasText: "learning" }).locator("strong")).toHaveText("1");
  await page.reload();
  await expect(page.locator(".stat-card").filter({ hasText: "learning" }).locator("strong")).toHaveText("1");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kannada-buddy-learning-state-v2") ?? "{}"))).toEqual(saved);
});

test("add Kannada recognition and reading without merging speaking evidence", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-06T12:00:00.000Z"));
  await page.goto("/settings");
  await page.getByRole("button", { name: "Speak + read", exact: true }).click();
  await page.getByRole("combobox", { name: "Romanization", exact: true }).selectOption("when_needed");
  await page.goto("/today");
  const firstUnit = [...orthographyUnits].sort((a, b) => a.order - b.order)[0];
  await expect(page.getByRole("heading", { name: firstUnit.title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Try one recognition check", exact: true }).click();
  await page.getByRole("button", { name: firstUnit.recognition[0].answer, exact: true }).click();
  await page.getByRole("button", { name: "Reveal and compare", exact: true }).click();
  await page.getByRole("button", { name: "Said it", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Read this aloud", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Read it", exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kannada-buddy-learning-state-v2") ?? "{}"));
  expect(saved.orthography[firstUnit.id]).toMatchObject({ attempts: 1, successes: 1 });
  expect(Object.values(saved.concepts)[0]).toMatchObject({ attempts: 1, readingAttempts: 1, readingSuccesses: 1 });
  expect(saved.evidence.map((item: { activity: string }) => item.activity)).toEqual(["grapheme_recognition", "cued_production", "script_reading"]);
});
