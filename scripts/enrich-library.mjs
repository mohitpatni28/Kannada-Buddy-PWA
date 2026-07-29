import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "data", "wikivoyage-phrases.ts");
const profilePath = path.join(root, "data", "library-profile.json");
const defaultOutput = path.join(root, "data", "library-enrichment-pilot.json");
const scopeIndex = process.argv.indexOf("--scope");
const outputIndex = process.argv.indexOf("--output");
const scope = scopeIndex >= 0 ? process.argv[scopeIndex + 1] : "pilot";
const outputPath = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1]) : defaultOutput;
const pipelineVersion = "1.0.0";

if (!["pilot", "all"].includes(scope)) {
  throw new Error(`Unsupported scope "${scope}". Use "pilot" or "all".`);
}

const sourceText = await fs.readFile(sourcePath, "utf8");
const arrayStart = sourceText.indexOf("= [");
const arrayEnd = sourceText.lastIndexOf("]");
if (arrayStart < 0 || arrayEnd < 0) {
  throw new Error("Could not locate the generated Wikivoyage phrase array.");
}
const phrases = JSON.parse(sourceText.slice(arrayStart + 2, arrayEnd + 1));
const kannadaPattern = /[\u0C80-\u0CFF]/;
const occurrenceCounts = new Map();
const sourceRecords = phrases.map((item) => {
  const sourceOccurrence = (occurrenceCounts.get(item.id) ?? 0) + 1;
  occurrenceCounts.set(item.id, sourceOccurrence);
  return { item, sourceOccurrence, draftId: `${item.id}#${sourceOccurrence}` };
});

function normalize(value) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

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

function countBy(items, getter) {
  return Object.fromEntries(
    [...items.reduce((counts, item) => {
      const key = getter(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  );
}

const englishCounts = countBy(phrases, (item) => normalize(item.english).toLocaleLowerCase());
const scriptCounts = countBy(phrases, (item) => normalize(item.kannadaScript));

function sourcePhrase(item) {
  return {
    english: item.english,
    kannadaScript: item.kannadaScript,
    kannadaRoman: item.kannadaRoman,
    category: item.category,
    tags: item.tags
  };
}

function sourceHash(item) {
  return hash(sourcePhrase(item));
}

function inspect(item) {
  const originalEnglishHasKannada = kannadaPattern.test(item.english);
  const originalScriptHasKannada = kannadaPattern.test(item.kannadaScript);
  const suspectedColumnSwap = originalEnglishHasKannada && !originalScriptHasKannada;
  const draftEnglish = normalize(suspectedColumnSwap ? item.kannadaScript : item.english);
  const draftScript = normalize(suspectedColumnSwap ? item.english : item.kannadaScript);
  const draftRoman = normalize(item.kannadaRoman);
  const scriptHasKannada = kannadaPattern.test(draftScript);
  const romanHasKannada = kannadaPattern.test(draftRoman);
  const bundledVariants = [item.english, item.kannadaScript, item.kannadaRoman].some((value) => /[\/|]/.test(value));
  const editorialMarkup = [item.english, item.kannadaScript, item.kannadaRoman].some((value) => /[\[\]()]/.test(value));
  const duplicateEnglish = englishCounts[normalize(item.english).toLocaleLowerCase()] > 1;
  const duplicateScript = scriptCounts[normalize(item.kannadaScript)] > 1;
  const longField = item.english.length > 80 || item.kannadaScript.length > 100 || item.kannadaRoman.length > 100;
  const highStakes = item.category === "emergency";
  const formalOrSpecialized = item.tags.includes("typical-kannada-formal-expressions");
  const unclearCategory = item.category === "wikivoyage";
  const mixedLatinScript = /[A-Za-z]{2,}/.test(draftScript);
  const issues = [];

  if (suspectedColumnSwap) issues.push("suspected_source_column_swap");
  if (!scriptHasKannada) issues.push("no_kannada_in_draft_script");
  if (romanHasKannada) issues.push("kannada_detected_in_romanization");
  if (bundledVariants) issues.push("bundled_source_variants");
  if (editorialMarkup) issues.push("editorial_or_morphology_markup");
  if (duplicateEnglish) issues.push("duplicate_english_gloss");
  if (duplicateScript) issues.push("duplicate_kannada_form");
  if (longField) issues.push("unusually_long_field");
  if (highStakes) issues.push("high_stakes_topic");
  if (formalOrSpecialized) issues.push("formal_or_specialized_source_section");
  if (unclearCategory) issues.push("source_category_needs_refinement");
  if (mixedLatinScript) issues.push("mixed_latin_kannada_script");

  const highRisk = !scriptHasKannada || romanHasKannada || highStakes || formalOrSpecialized || longField;
  const mediumRisk = suspectedColumnSwap || bundledVariants || editorialMarkup || duplicateEnglish || duplicateScript || unclearCategory;
  const risk = highRisk ? "high" : mediumRisk ? "medium" : "low";
  return {
    draftEnglish,
    draftScript,
    draftRoman,
    scriptHasKannada,
    romanHasKannada,
    suspectedColumnSwap,
    bundledVariants,
    highStakes,
    formalOrSpecialized,
    risk,
    issues
  };
}

function registerFor(item, audit) {
  const text = `${item.english} ${item.kannadaRoman}`.toLocaleLowerCase();
  if (audit.formalOrSpecialized) return "formal";
  if (/with respect|sir|madam|please|could you|can you/.test(text)) return "polite";
  if (/man\b|miss\b|buddy|singular/.test(text)) return "casual";
  if (audit.bundledVariants || /plural|gender|elder|younger/.test(text)) return "context_dependent";
  return "neutral";
}

const usageContexts = {
  basics: "General conversation and everyday interaction.",
  food: "Ordering food, discussing ingredients, or identifying food and drink.",
  transport: "Directions, taxis, buses, trains, and local travel.",
  numbers: "Numbers, quantities, prices, dates, or frequency.",
  shop: "Shopping, prices, money, and payment.",
  emergency: "Emergency, medical, authority, or problem situations; verify before relying on it.",
  lodging: "Hotels, lodging, check-in, and accommodation.",
  time: "Time, dates, schedules, and duration.",
  phone: "Phone calls and contact details.",
  family: "Family and personal relationships.",
  wikivoyage: "Source section needs a more specific usage classification."
};

function naturalnessFor(audit) {
  if (audit.highStakes) return "unverified_high_stakes";
  if (audit.formalOrSpecialized) return "bookish_or_specialized";
  if (audit.bundledVariants) return "variant_selection_needed";
  if (!audit.scriptHasKannada) return "unverified";
  return "general_kannada_candidate";
}

function enrich(record, pilotBatch) {
  const { item, sourceOccurrence, draftId } = record;
  const audit = inspect(item);
  const reviewQueue = audit.risk === "high"
    ? "priority_human_review"
    : audit.risk === "medium" ? "standard_human_review" : "automated_reference";
  const publicationEligibility = !audit.scriptHasKannada || audit.romanHasKannada
    ? "hold_for_human_review"
    : audit.highStakes ? "library_ai_draft_caution" : "library_ai_draft";
  const notes = [
    "This is an automated reference draft, not human or native-speaker approval.",
    ...(audit.suspectedColumnSwap
      ? ["The draft repairs a probable source column swap without changing the imported source record."]
      : []),
    ...(audit.bundledVariants
      ? ["The source contains multiple forms; a later reviewer should select or split learner-facing variants."]
      : []),
    ...(audit.highStakes
      ? ["High-stakes wording must be reviewed before it is relied on in a real emergency."]
      : [])
  ];
  return {
    sourceId: item.id,
    sourceOccurrence,
    draftId,
    sourceHash: sourceHash(item),
    pilotBatch,
    sourcePhrase: sourcePhrase(item),
    draft: {
      english: audit.draftEnglish,
      kannadaScript: audit.draftScript,
      kannadaRoman: audit.draftRoman,
      category: item.category,
      tags: [...new Set([...item.tags, "automated-draft", `${audit.risk}-risk`])],
      register: registerFor(item, audit),
      bengaluruNaturalness: naturalnessFor(audit),
      usageContext: usageContexts[item.category] ?? usageContexts.wikivoyage
    },
    assessment: {
      risk: audit.risk,
      issues: audit.issues,
      scriptHasKannada: audit.scriptHasKannada,
      romanizationSurfaceCheck: !audit.scriptHasKannada || audit.romanHasKannada
        ? "failed"
        : audit.bundledVariants ? "ambiguous" : "surface_plausible",
      semanticCheck: "not_automatically_verified",
      draftConfidence: audit.risk === "low" ? 0.9 : audit.risk === "medium" ? 0.7 : 0.4,
      notes
    },
    reviewQueue,
    publicationEligibility,
    reviewClaim: "not_human_or_native_reviewed"
  };
}

const audited = sourceRecords.map((record) => ({ ...record, audit: inspect(record.item) }));
const profile = {
  schemaVersion: 1,
  source: {
    file: "data/wikivoyage-phrases.ts",
    itemCount: phrases.length,
    fingerprint: hash(phrases.map(sourcePhrase))
  },
  categories: countBy(phrases, (item) => item.category),
  sourceSections: countBy(phrases, (item) => item.tags[1] ?? "unknown"),
  riskCounts: countBy(audited, ({ audit }) => audit.risk),
  issueCounts: Object.fromEntries(
    Object.entries(countBy(audited.flatMap(({ audit }) => audit.issues), (issue) => issue))
  ),
  constraints: {
    canonicalSourceChanged: false,
    productionCourseChanged: false,
    publicAudioChanged: false,
    validationClaim: "automated_draft_not_human_or_native_review"
  }
};

function take(items, count, used) {
  const selected = [];
  for (const record of items) {
    if (selected.length === count) break;
    if (used.has(record.draftId)) continue;
    selected.push(record);
    used.add(record.draftId);
  }
  if (selected.length !== count) throw new Error(`Could only select ${selected.length} of ${count} pilot items.`);
  return selected;
}

function selectPilot() {
  const used = new Set();
  const clean = (category) => audited
    .filter(({ item, audit }) => item.category === category && audit.risk === "low")
    .map(({ item, sourceOccurrence, draftId }) => ({ item, sourceOccurrence, draftId }));
  const basics = take(clean("basics"), 10, used).map((record) => [record, "clean-basics"]);
  const transport = take(clean("transport"), 10, used).map((record) => [record, "clean-transport"]);
  const foodShop = [
    ...take(clean("food"), 5, used),
    ...take(clean("shop"), 5, used)
  ].map((record) => [record, "clean-food-shop"]);
  const swaps = audited
    .filter(({ audit }) => audit.suspectedColumnSwap)
    .map(({ item, sourceOccurrence, draftId }) => ({ item, sourceOccurrence, draftId }));
  const unresolvedScript = audited
    .filter(({ audit }) => !audit.scriptHasKannada && !audit.suspectedColumnSwap)
    .map(({ item, sourceOccurrence, draftId }) => ({ item, sourceOccurrence, draftId }));
  const variants = audited
    .filter(({ audit }) => audit.bundledVariants && !audit.suspectedColumnSwap)
    .map(({ item, sourceOccurrence, draftId }) => ({ item, sourceOccurrence, draftId }));
  const anomalies = [
    ...take(swaps, 4, used),
    ...take(unresolvedScript, 2, used),
    ...take(variants, 4, used)
  ].map((record) => [record, "deliberate-anomalies"]);
  return [...basics, ...transport, ...foodShop, ...anomalies];
}

const selected = scope === "pilot"
  ? selectPilot()
  : sourceRecords.map((record) => [record, `full-${record.item.category}`]);
const items = selected.map(([record, batch]) => enrich(record, batch));
const generatedAt = new Date().toISOString();
const artifact = {
  schemaVersion: 1,
  artifactStatus: "non_canonical_ai_draft",
  source: {
    file: "data/wikivoyage-phrases.ts",
    license: "CC BY-SA",
    itemCount: phrases.length,
    fingerprint: profile.source.fingerprint
  },
  pipeline: {
    name: "kannada-buddy-library-enrichment",
    version: pipelineVersion,
    generatedAt,
    validationClaim: "automated_draft_not_human_or_native_review"
  },
  summary: {
    scope,
    itemCount: items.length,
    batchCounts: countBy(items, (item) => item.pilotBatch),
    riskCounts: countBy(items, (item) => item.assessment.risk),
    reviewQueueCounts: countBy(items, (item) => item.reviewQueue)
  },
  items
};

await fs.writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`);
await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Profiled ${phrases.length} source candidates.`);
console.log(`Wrote ${items.length} ${scope} enrichment drafts to ${path.relative(root, outputPath)}.`);
console.log(`Review queues: ${JSON.stringify(artifact.summary.reviewQueueCounts)}.`);
