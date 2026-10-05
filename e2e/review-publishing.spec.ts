import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sourceAdminLibraryPhrases } from "../data/library-reference";
import { validatePublishedReviews, validateReviewBundle } from "../lib/reviewPublishing";

// Isolated test review only: never writes approvals into the tracked artifact.
test("admin exports a real reviewed download which the publishing CLI accepts", async ({ page, context }) => {
  await context.setHTTPCredentials({ username: "test-reviewer", password: "local-e2e-password-only" });
  const source = sourceAdminLibraryPhrases.find((phrase) => phrase.status === "ai_draft" && phrase.kannadaScript)!;
  await page.goto("/admin");
  await page.getByRole("button", { name: /^all \(/ }).click();
  await page.getByRole("searchbox").fill(source.english);
  const card = page.locator("article").filter({ has: page.getByText(source.english, { exact: true }) }).filter({ has: page.getByText(source.kannadaRoman, { exact: true }) }).first();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Usage note", exact: true }).fill("Browser test review; source wording preserved.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await card.getByRole("button", { name: "Approve for export", exact: true }).click();
  await page.getByText("Export and publish approved reviews", { exact: true }).click();
  await page.getByLabel("Reviewer name").fill("Isolated browser test reviewer");
  for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export approved reviews" }).click();
  const download = await downloadPromise;
  const directory = await mkdtemp(join(tmpdir(), "kannada-browser-review-"));
  try {
    const input = join(directory, "review.json");
    const output = join(directory, "published.json");
    await download.saveAs(input);
    const bundle = validateReviewBundle(JSON.parse(await readFile(input, "utf8")), sourceAdminLibraryPhrases);
    expect(bundle.records).toHaveLength(1);
    expect(bundle.records[0].id).toBe(source.id);
    await writeFile(output, JSON.stringify({ format: "kannada-buddy-published-reviews", version: 1, records: [] }));
    const args = ["--experimental-strip-types", "scripts/publish-reviewed-phrases.mjs", "--input", input, "--output", output];
    expect(execFileSync(process.execPath, [...args, "--check"], { encoding: "utf8" })).toContain("No files changed");
    expect(JSON.parse(await readFile(output, "utf8")).records).toHaveLength(0);
    execFileSync(process.execPath, [...args, "--write"], { encoding: "utf8" });
    const published = validatePublishedReviews(JSON.parse(await readFile(output, "utf8")), sourceAdminLibraryPhrases);
    expect(published.records[0].content.usageNote).toBe("Browser test review; source wording preserved.");
    await expect(page.getByRole("status").filter({ hasText: "Exported 1" })).toContainText("live site changes after validation and redeployment");
    expect(await page.evaluate(() => localStorage.getItem("kannada-buddy-learning-state-v2"))).toBeNull();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
