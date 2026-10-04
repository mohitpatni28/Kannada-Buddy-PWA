import { expect, test } from "@playwright/test";
import { learningConcepts } from "../data/learning-concepts";

const learningKey = "kannada-buddy-learning-state-v2";
const preferenceKey = "kannada-buddy-learning-preferences-v2";
const overridesKey = "kannada-buddy-library-overrides";
const preferences = { learningMode: "speaking", romanization: "always", sessionMinutes: 5, referenceDeck: "core_only" };
const savedConcept = (id: string, nextReviewAt = "2100-01-01T00:00:00.000Z") => ({
  conceptId: id, attempts: 2, successes: 2, lapses: 0, stabilityDays: 4,
  lastSeenAt: "2026-01-01T00:00:00.000Z", nextReviewAt,
  readingAttempts: 0, readingSuccesses: 0
});

test("learning progress responds to real cross-tab updates and clearing", async ({ page, context }) => {
  await page.goto("/review");
  const started = page.locator(".stat-card").filter({ hasText: "learning" }).locator("strong");
  await expect(started).toHaveText("0");
  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await otherTab.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: learningKey, value: { concepts: { "greet-hello": savedConcept("greet-hello") }, orthography: {}, evidence: [] }
  });
  await expect(started).toHaveText("1");
  await expect(page.getByRole("heading", { name: "Greet someone politely", exact: true })).toBeVisible();
  await otherTab.evaluate(() => localStorage.clear());
  await expect(started).toHaveText("0");
});

test("adaptive session stays stable while rating and persists progress on reload", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-04T12:00:00.000Z"));
  await page.goto("/");
  const state = { concepts: Object.fromEntries(learningConcepts.map((concept) => [concept.id,
    savedConcept(concept.id, concept.id === "greet-hello" ? "2000-01-01T00:00:00.000Z" : "2100-01-01T00:00:00.000Z")
  ])), orthography: {}, evidence: [] };
  await page.evaluate(({ stateKey, prefKey, state, preferences }) => {
    localStorage.setItem(stateKey, JSON.stringify(state));
    localStorage.setItem(prefKey, JSON.stringify(preferences));
  }, { stateKey: learningKey, prefKey: preferenceKey, state, preferences });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Greet someone politely", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reveal and compare", exact: true }).click();
  await page.getByRole("button", { name: "Said it", exact: true }).click();
  await expect(page.getByText("Session complete", { exact: true })).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), learningKey);
  expect(saved.concepts["greet-hello"].successes).toBe(3);
  expect(saved.concepts["greet-hello"].nextReviewAt).toBe("2026-10-11T12:00:00.000Z");
  expect(saved.concepts["greet-thanks"]).toEqual(state.concepts["greet-thanks"]);
  await page.goto("/review");
  await expect(page.locator(".stat-card").filter({ hasText: "due now" }).locator("strong")).toHaveText("0");
  await page.reload();
  await expect(page.locator(".stat-card").filter({ hasText: "learning" }).locator("strong")).toHaveText(String(learningConcepts.length));
  expect(errors).toEqual([]);
});

test("admin hydrates edited drafts and preserves edits through approval", async ({ page, context }) => {
  await context.setHTTPCredentials({ username: "test-reviewer", password: "local-e2e-password-only" });
  const id = "wv-how-do-you-do-how-do-you-do-plural-with-respect#1";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await page.evaluate(({ key, id }) => localStorage.setItem(key, JSON.stringify({
    [id]: { id, english: "Browser regression phrase", usageNote: "Preserve this edit", status: "human_review_required" }
  })), { key: overridesKey, id });
  await page.goto("/admin");
  await page.getByRole("button", { name: /^held \(\d+\)$/ }).click();
  const card = page.locator("article").filter({ has: page.getByText("Browser regression phrase", { exact: true }) });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "English meaning", exact: true })).toHaveValue("Browser regression phrase");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await card.getByRole("button", { name: "Approve locally for Library", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: /^approved \(\d+\)$/ }).click();
  await expect(card).toBeVisible();
  const saved = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key) ?? "{}")[id], { key: overridesKey, id });
  expect(saved).toMatchObject({ id, english: "Browser regression phrase", usageNote: "Preserve this edit", status: "approved" });
  await page.reload();
  await page.getByRole("button", { name: /^approved \(\d+\)$/ }).click();
  await expect(card).toBeVisible();
  expect(errors).toEqual([]);
});

test("settings persist mode and session length without erasing learning progress", async ({ page }) => {
  await page.goto("/");
  const state = { concepts: { "greet-hello": savedConcept("greet-hello") }, orthography: {}, evidence: [] };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: learningKey, value: state });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Speak + read", exact: true }).click();
  await page.getByRole("button", { name: "10 min", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Speak + read", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "10 min", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), learningKey)).toEqual(state);
});
