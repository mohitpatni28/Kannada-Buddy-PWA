// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { automatedReferencePhrases } from "@/data/library-reference";
import { seedPhrases } from "@/data/seed-phrases";
import { createReviewRecord, createReviewBundle } from "@/lib/reviewPublishing";
const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "kannada-publishing-")); temporary.push(dir);
  const input = join(dir, "review.json"); const output = join(dir, "published.json");
  const at = "2026-09-01T10:00:00.000Z";
  const record = createReviewRecord(seedPhrases[0], { ...seedPhrases[0], english: "Hello (reviewed)" }, "Reviewer", at, { meaning: true, script: true, romanization: true, context: true });
  await writeFile(input, JSON.stringify(createReviewBundle([record], at)));
  const original = JSON.stringify({ format: "kannada-buddy-published-reviews", version: 1, records: [] });
  await writeFile(output, original);
  return { input, output, original };
}
function run(args: string[]) {
  return spawnSync(process.execPath, ["--experimental-strip-types", resolve("scripts/publish-reviewed-phrases.mjs"), ...args], { encoding: "utf8" });
}
// Real Node subprocess startup can compete with full-suite workers and production builds.
// Keep every assertion; allow a bounded 15 seconds for these process-level integrations.
describe("review publication command", () => {
  it("checks without writes, then writes validated edits atomically with stable identity", async () => {
    const { input, output, original } = await fixture();
    const checked = run(["--input", input, "--output", output, "--check"]);
    expect(checked.status, checked.stderr).toBe(0);
    expect(checked.stdout).toContain("No files changed");
    expect(await readFile(output, "utf8")).toBe(original);
    const written = run(["--input", input, "--output", output, "--write"]);
    expect(written.status, written.stderr).toBe(0);
    const artifact = JSON.parse(await readFile(output, "utf8"));
    expect(artifact.records).toHaveLength(1);
    expect(artifact.records[0]).toMatchObject({ id: "greet-hello", content: { english: "Hello (reviewed)" }, review: { reviewer: "Reviewer" } });
    expect(run(["--input", input, "--output", output, "--write"]).status).toBe(0);
    expect(JSON.parse(await readFile(output, "utf8")).records).toHaveLength(1);
  }, 15_000);
  it("promotes an explicitly reviewed held draft using its original fingerprint", async () => {
    const { input, output } = await fixture();
    const source = automatedReferencePhrases.find((phrase) => phrase.status === "human_review_required");
    if (!source) throw new Error("Held draft fixture is missing");
    const at = "2026-09-01T10:00:00.000Z";
    const record = createReviewRecord(source, { ...source, english: "Reviewed source meaning", kannadaScript: "ನಮಸ್ಕಾರ", kannadaRoman: "Namaskara", category: "greetings", usageNote: "Manually checked context" }, "Reviewer", at, { meaning: true, script: true, romanization: true, context: true });
    await writeFile(input, JSON.stringify(createReviewBundle([record], at)));
    const result = run(["--input", input, "--output", output, "--write"]);
    expect(result.status, result.stderr).toBe(0);
    const artifact = JSON.parse(await readFile(output, "utf8"));
    expect(artifact.records[0].id).toBe(source.id);
    expect(artifact.records[0].base.sourceHash).toBe(source.automation?.sourceHash);
    const old = await readFile(output, "utf8");
    record.base.sourceHash = "stale";
    await writeFile(input, JSON.stringify(createReviewBundle([record], at)));
    expect(run(["--input", input, "--output", output, "--write"]).status).toBe(1);
    expect(await readFile(output, "utf8")).toBe(old);
  }, 15_000);
  it("rejects malformed input, invalid arguments and oversized files without changing output", async () => {
    const { input, output, original } = await fixture();
    for (const args of [["--input", input], ["--input", input, "--check", "--write"], ["--input", input, "--write", "--wat"], ["--input", input, "--output", input, "--write"]]) expect(run(args).status).toBe(1);
    await writeFile(input, '{"format":"forged"}');
    expect(run(["--input", input, "--output", output, "--write"]).status).toBe(1);
    await writeFile(input, " ".repeat(5 * 1024 * 1024 + 1));
    expect(run(["--input", input, "--output", output, "--write"]).stderr).toContain("5 MB");
    expect(await readFile(output, "utf8")).toBe(original);
  }, 15_000);
});
