import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const artifactPath = path.resolve(process.argv[2] ?? "data/library-enrichment-pilot.json");
const sourcePath = path.join(root, "data", "wikivoyage-phrases.ts");

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function sourcePhrase(item) {
  return {
    english: item.english,
    kannadaScript: item.kannadaScript,
    kannadaRoman: item.kannadaRoman,
    category: item.category,
    tags: item.tags
  };
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

const sourceText = await fs.readFile(sourcePath, "utf8");
const arrayStart = sourceText.indexOf("= [");
const arrayEnd = sourceText.lastIndexOf("]");
const sourceItems = JSON.parse(sourceText.slice(arrayStart + 2, arrayEnd + 1));
const sourceById = sourceItems.reduce((items, item) => {
  const matches = items.get(item.id) ?? [];
  matches.push(item);
  items.set(item.id, matches);
  return items;
}, new Map());
const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
const errors = [];
const seen = new Set();

assert(artifact.schemaVersion === 1, "schemaVersion must be 1", errors);
assert(artifact.artifactStatus === "non_canonical_ai_draft", "artifact must remain non-canonical", errors);
assert(artifact.pipeline?.validationClaim === "automated_draft_not_human_or_native_review", "artifact must not claim human/native validation", errors);
assert(artifact.source?.itemCount === sourceItems.length, "source item count is stale", errors);
assert(artifact.source?.fingerprint === hash(sourceItems.map(sourcePhrase)), "source fingerprint is stale", errors);
assert(Array.isArray(artifact.items) && artifact.items.length > 0, "artifact must contain draft items", errors);

for (const item of artifact.items ?? []) {
  const label = item.draftId ?? item.sourceId ?? "(missing id)";
  assert(!seen.has(label), `${label}: duplicate draft ID`, errors);
  seen.add(label);
  const occurrences = sourceById.get(item.sourceId);
  const source = occurrences?.[item.sourceOccurrence - 1];
  assert(Boolean(source), `${label}: source ID/occurrence no longer exists`, errors);
  if (!source) continue;
  assert(item.draftId === `${item.sourceId}#${item.sourceOccurrence}`, `${label}: invalid draft ID`, errors);
  assert(item.sourceHash === hash(sourcePhrase(source)), `${label}: stale source hash`, errors);
  assert(stableJson(item.sourcePhrase) === stableJson(sourcePhrase(source)), `${label}: embedded source fields were changed`, errors);
  assert(item.reviewClaim === "not_human_or_native_reviewed", `${label}: invalid review claim`, errors);
  assert(["automated_reference", "standard_human_review", "priority_human_review"].includes(item.reviewQueue), `${label}: invalid review queue`, errors);
  assert(["library_ai_draft", "library_ai_draft_caution", "hold_for_human_review"].includes(item.publicationEligibility), `${label}: invalid publication eligibility`, errors);
  assert(item.draft?.english?.length > 0, `${label}: draft English is empty`, errors);
  assert(item.draft?.kannadaScript?.length > 0, `${label}: draft Kannada is empty`, errors);
  assert(item.draft?.kannadaRoman?.length > 0, `${label}: draft romanization is empty`, errors);
  assert(item.assessment?.semanticCheck === "not_automatically_verified", `${label}: automated semantic verification is not allowed`, errors);
  assert(item.assessment?.draftConfidence >= 0 && item.assessment?.draftConfidence <= 1, `${label}: confidence must be between 0 and 1`, errors);
  if (item.publicationEligibility === "hold_for_human_review") {
    assert(item.reviewQueue === "priority_human_review", `${label}: held items must use the priority queue`, errors);
  }
}

if (artifact.summary?.scope === "pilot") {
  assert(artifact.items.length === 40, "pilot must contain exactly 40 items", errors);
  const batchCounts = artifact.items.reduce((counts, item) => {
    counts[item.pilotBatch] = (counts[item.pilotBatch] ?? 0) + 1;
    return counts;
  }, {});
  for (const batch of ["clean-basics", "clean-transport", "clean-food-shop", "deliberate-anomalies"]) {
    assert(batchCounts[batch] === 10, `pilot batch ${batch} must contain exactly 10 items`, errors);
  }
}

if (artifact.summary?.scope === "all") {
  assert(artifact.items.length === sourceItems.length, "full artifact must preserve every source occurrence", errors);
}

const prohibitedIds = new Set(
  JSON.parse(await fs.readFile(path.join(root, "audio", "phrases.json"), "utf8")).map((item) => item.id)
);
assert(
  artifact.items.every((item) => !prohibitedIds.has(item.sourceId)),
  "pilot must not reuse or mutate production-course audio IDs",
  errors
);

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  throw new Error(`Library enrichment validation failed with ${errors.length} error(s).`);
}

console.log(`Validated ${artifact.items.length} non-canonical library drafts against ${sourceItems.length} source candidates.`);
console.log(`No item claims human/native review; no production course/audio IDs were promoted.`);
