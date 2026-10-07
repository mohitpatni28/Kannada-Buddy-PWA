import { expect, test, type Page } from "@playwright/test";

const learningKey = "kannada-buddy-learning-state-v2";
const preferencesKey = "kannada-buddy-learning-preferences-v2";
const oldAppCache = "kannada-buddy-synthetic-previous-release";
const unrelatedCache = "synthetic-unrelated-cache";

async function awaitProductionWorker(page: Page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  expect(await page.evaluate(() => new URL(navigator.serviceWorker.controller!.scriptURL).pathname)).toBe("/sw.js");
  const cachedPaths = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("kannada-buddy-")) continue;
      for (const request of await (await caches.open(name)).keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });
  expect(cachedPaths).toContain("/today");
  expect(cachedPaths).toContain("/review");
  expect(cachedPaths.some((path) => path.startsWith("/_next/static/") && path.endsWith(".js"))).toBe(true);
}

test("first installation supports hydrated speaking practice and saved progress offline", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "How do you want to learn?", exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), learningKey)).toBeNull();
  await awaitProductionWorker(page);
  await context.setOffline(true);
  try {
    const navigation = await page.goto("/today");
    expect(navigation?.status()).toBe(200);
    expect(navigation?.fromServiceWorker()).toBe(true);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    await page.getByRole("button", { name: /Speak Kannada.*Choose speaking/ }).click();
    const prompt = await page.locator(".practice-prompt h2").textContent();
    expect(prompt).toBeTruthy();
    await page.getByRole("button", { name: "Reveal and compare", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Compare your answer", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Said it", exact: true }).click();
    const saved = await page.evaluate((key) => localStorage.getItem(key), learningKey);
    expect(saved).not.toBeNull();
    const review = await page.goto("/review");
    expect(review?.fromServiceWorker()).toBe(true);
    await expect(page.getByRole("heading", { name: prompt!, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: prompt!, exact: true })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), learningKey)).toBe(saved);
    expect(errors).toEqual([]);
  } finally {
    await context.setOffline(false);
  }
});

test("activation removes a synthetic prior app cache while preserving other caches and learner progress", async ({ page, context }) => {
  // This models historical cache/storage state. It does not install an entire
  // previous Next deployment or mock the worker, route HTML, or static chunks.
  await page.goto("/manifest.json");
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  const progress = JSON.stringify({
    concepts: {
      "greet-hello": {
        conceptId: "greet-hello", attempts: 2, successes: 1, lapses: 1, stabilityDays: 4,
        lastSeenAt: "2026-10-04T12:00:00.000Z", nextReviewAt: "2100-01-01T00:00:00.000Z",
        readingAttempts: 0, readingSuccesses: 0
      }
    },
    orthography: {}, evidence: []
  });
  const preferences = JSON.stringify({ learningMode: "speaking", romanization: "always", sessionMinutes: 5, referenceDeck: "core_only" });
  await page.evaluate(async ({ oldAppCache, unrelatedCache, learningKey, preferencesKey, progress, preferences }) => {
    await (await caches.open(oldAppCache)).put("/synthetic-old-release-entry", new Response("Synthetic historical app cache"));
    await (await caches.open(unrelatedCache)).put("/synthetic-unrelated-entry", new Response("Keep this unrelated cache"));
    localStorage.setItem(learningKey, progress);
    localStorage.setItem(preferencesKey, preferences);
  }, { oldAppCache, unrelatedCache, learningKey, preferencesKey, progress, preferences });
  expect(await page.evaluate(async () => caches.keys())).toEqual(expect.arrayContaining([oldAppCache, unrelatedCache]));
  await page.goto("/review");
  await awaitProductionWorker(page);
  const cacheNames = await page.evaluate(async () => caches.keys());
  expect(cacheNames).not.toContain(oldAppCache);
  expect(cacheNames).toContain(unrelatedCache);
  expect(cacheNames.filter((name) => name.startsWith("kannada-buddy-"))).toHaveLength(1);
  expect(await page.evaluate(async (name) => (await (await caches.open(name)).match("/synthetic-unrelated-entry"))?.text(), unrelatedCache)).toBe("Keep this unrelated cache");
  expect(await page.evaluate((key) => localStorage.getItem(key), learningKey)).toBe(progress);
  expect(await page.evaluate((key) => localStorage.getItem(key), preferencesKey)).toBe(preferences);
  await expect(page.getByRole("heading", { name: "Greet someone politely", exact: true })).toBeVisible();
  await context.setOffline(true);
  try {
    const navigation = await page.goto("/review");
    expect(navigation?.status()).toBe(200);
    expect(navigation?.fromServiceWorker()).toBe(true);
    await expect(page.getByRole("heading", { name: "Greet someone politely", exact: true })).toBeVisible();
    await expect(page.locator(".stat-card").filter({ hasText: "learning" }).locator("strong")).toHaveText("1");
    await page.reload();
    expect(await page.evaluate((key) => localStorage.getItem(key), learningKey)).toBe(progress);
    expect(await page.evaluate((key) => localStorage.getItem(key), preferencesKey)).toBe(preferences);
  } finally {
    await context.setOffline(false);
  }
});
