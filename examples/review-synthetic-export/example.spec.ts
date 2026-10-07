import { expect, test } from "../fixtures";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sourceAdminLibraryPhrases } from "../../data/library-reference";

// Browser-only synthetic attestations demonstrate export mechanics, not language approval.
test("export a synthetic admin review and validate it without publishing", async ({ page, context }) => {
  await page.clock.setFixedTime(new Date("2026-10-06T12:00:00.000Z"));
  await context.setHTTPCredentials({ username: "example-reviewer", password: "synthetic-example-password-only" });
  const source = sourceAdminLibraryPhrases.find((phrase) => phrase.status === "ai_draft" && phrase.kannadaScript);
  if (!source) throw new Error("The synthetic export source fixture is missing.");
  const publishedBefore = await readFile("data/published-phrases.json");
  await page.goto("/admin");
  await page.getByRole("button", { name: /^all \(/ }).click();
  await page.getByRole("searchbox").fill(source.english);
  const card = page.locator("article").filter({ has: page.getByText(source.english, { exact: true }) }).filter({ has: page.getByText(source.kannadaRoman, { exact: true }) }).first();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Usage note", exact: true }).fill("SYNTHETIC EXAMPLE — NOT A HUMAN OR NATIVE REVIEW. Original source wording preserved.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await card.getByRole("button", { name: "Approve for export", exact: true }).click();
  await page.getByText("Export and publish approved reviews", { exact: true }).click();
  await page.getByLabel("Reviewer name").fill("SYNTHETIC EXAMPLE — NOT A HUMAN REVIEW");
  for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export approved reviews", exact: true }).click();
  const directory = await mkdtemp(join(tmpdir(), "kannada-synthetic-export-"));
  try {
    const input = join(directory, "synthetic-export.json");
    const output = join(directory, "temporary-publication.json");
    await (await downloaded).saveAs(input);
    const exported = JSON.parse(await readFile(input, "utf8"));
    expect(exported.records).toHaveLength(1);
    expect(exported.records[0].id).toBe(source.id);
    expect(exported.records[0].review.reviewer).toBe("SYNTHETIC EXAMPLE — NOT A HUMAN REVIEW");
    expect(exported.records[0].content.kannadaScript).toBe(source.kannadaScript);
    const empty = JSON.stringify({ format: "kannada-buddy-published-reviews", version: 1, records: [] });
    await writeFile(output, empty);
    const checked = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/publish-reviewed-phrases.mjs", "--input", input, "--output", output, "--check"], { encoding: "utf8", timeout: 30_000 });
    expect(checked.status, checked.stderr).toBe(0);
    expect(checked.stdout).toContain("Validated 1 reviewed phrases; publication would contain 1. No files changed.");
    expect(await readFile(output, "utf8")).toBe(empty);
    expect(await readFile("data/published-phrases.json")).toEqual(publishedBefore);
    await expect(page.getByRole("status").filter({ hasText: "Exported 1" })).toContainText("live site changes after validation and redeployment");
    expect(await page.evaluate(() => localStorage.getItem("kannada-buddy-learning-state-v2"))).toBeNull();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
