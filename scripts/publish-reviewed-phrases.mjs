import { readFile, writeFile, rename, unlink, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { seedPhrases } from "../data/seed-phrases.ts";
import { wikivoyagePhrases } from "../data/wikivoyage-phrases.ts";
import { MAX_REVIEW_BYTES, validateReviewBundle, validatePublishedReviews, mergePublishedReviews } from "../lib/reviewPublishing.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function boundedJson(path) {
  if ((await stat(path)).size > MAX_REVIEW_BYTES) throw new Error("Review file exceeds the 5 MB limit.");
  return JSON.parse(await readFile(path, "utf8"));
}
async function sources() {
  const artifact = JSON.parse(await readFile(resolve(projectRoot, "data/library-enrichment-all.json"), "utf8"));
  const counts = new Map();
  const originals = new Map();
  for (const phrase of wikivoyagePhrases) {
    const count = (counts.get(phrase.id) ?? 0) + 1;
    counts.set(phrase.id, count);
    originals.set(`${phrase.id}#${count}`, phrase);
  }
  return [...seedPhrases, ...artifact.items.map((item) => {
    const original = originals.get(item.draftId);
    if (!original) throw new Error(`Source missing: ${item.draftId}`);
    return { ...original, ...item.draft, id: item.draftId, usageNote: item.draft.usageContext, automation: { sourceHash: item.sourceHash } };
  })];
}
async function main() {
  const args = process.argv.slice(2);
  let input;
  let output = resolve(projectRoot, "data/published-phrases.json");
  let mode;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--input" || arg === "--output") {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a path.`);
      if (arg === "--input") { if (input) throw new Error("Duplicate --input."); input = resolve(value); }
      else output = resolve(value);
    } else if (arg === "--check" || arg === "--write") {
      if (mode) throw new Error("Choose exactly one of --check and --write.");
      mode = arg;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!input || !mode) throw new Error("Usage: node --experimental-strip-types scripts/publish-reviewed-phrases.mjs --input export.json (--check | --write) [--output path]");
  if (input === output) throw new Error("Input and publication output must be different files.");
  const originalSources = await sources();
  const bundle = validateReviewBundle(await boundedJson(input), originalSources);
  const existing = validatePublishedReviews(await boundedJson(output), originalSources);
  const published = mergePublishedReviews(existing, bundle);
  if (mode === "--check") {
    process.stdout.write(`Validated ${bundle.records.length} reviewed phrases; publication would contain ${published.records.length}. No files changed.\n`);
    return;
  }
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(published, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await rename(temporary, output);
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; });
  }
  process.stdout.write(`Published artifact updated with ${bundle.records.length} reviewed phrases (${published.records.length} total). Commit and redeploy to make them available to everyone.\n`);
}
main().catch((error) => {
  process.stderr.write(`Publication rejected: ${error.message}\n`);
  process.exitCode = 1;
});
