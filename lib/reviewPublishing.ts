import type { PhraseItem } from "./types";

export type ReviewContent = {
  english: string;
  kannadaRoman: string;
  kannadaScript: string;
  category: string;
  usageNote: string;
};
export type PublicationReview = {
  reviewer: string;
  reviewedAt: string;
  checks: { meaning: true; script: true; romanization: true; context: true };
};
export type ReviewRecord = {
  id: string;
  base: ReviewContent & { sourceHash: string | null };
  content: ReviewContent;
  review: PublicationReview;
};
export type ReviewBundle = {
  format: "kannada-buddy-review-export";
  version: 1;
  exportedAt: string;
  records: ReviewRecord[];
};
export type PublishedReviews = {
  format: "kannada-buddy-published-reviews";
  version: 1;
  records: ReviewRecord[];
};

export const MAX_REVIEW_BYTES = 5 * 1024 * 1024;
const contentKeys = ["english", "kannadaRoman", "kannadaScript", "category", "usageNote"];
function object(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key))) throw new Error(`${label} contains unsupported fields.`);
  if (keys.some((key) => !Object.hasOwn(record, key))) throw new Error(`${label} is incomplete.`);
  return record;
}
function text(value: unknown, label: string, max = 2000, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}
function date(value: unknown, label: string): string {
  const result = text(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(result) || !Number.isFinite(Date.parse(result)) || Date.parse(result) > Date.now() + 300_000 || new Date(result).toISOString() !== result.replace(/Z$/, result.includes(".") ? "Z" : ".000Z")) throw new Error(`${label} must be a valid, non-future UTC timestamp.`);
  return result;
}
function content(value: unknown, label: string): ReviewContent {
  const item = object(value, contentKeys, label);
  const result = {
    english: text(item.english, `${label} English`),
    kannadaRoman: text(item.kannadaRoman, `${label} romanization`),
    kannadaScript: text(item.kannadaScript, `${label} Kannada script`),
    category: text(item.category, `${label} category`, 80),
    usageNote: text(item.usageNote, `${label} usage note`, 4000, true)
  };
  if (!/^[a-z][a-z0-9_-]*$/.test(result.category)) throw new Error(`${label} category must be a category identifier.`);
  if (!/[\u0c80-\u0cff]/u.test(result.kannadaScript)) throw new Error(`${label} must include Kannada script.`);
  return result;
}
export function sourceContent(phrase: PhraseItem): ReviewContent {
  return { english: phrase.english, kannadaRoman: phrase.kannadaRoman, kannadaScript: phrase.kannadaScript ?? "", category: phrase.category, usageNote: phrase.usageNote ?? "" };
}
export function createReviewRecord(source: PhraseItem, edited: PhraseItem, reviewer: string, reviewedAt: string, checks: PublicationReview["checks"]): ReviewRecord {
  return {
    id: source.id,
    base: { ...sourceContent(source), sourceHash: source.automation?.sourceHash ?? null },
    content: sourceContent(edited),
    review: { reviewer, reviewedAt, checks }
  };
}
export function createReviewBundle(records: ReviewRecord[], exportedAt: string): ReviewBundle {
  return { format: "kannada-buddy-review-export", version: 1, exportedAt, records };
}
function validateRecords(value: unknown, sources: PhraseItem[]): ReviewRecord[] {
  if (!Array.isArray(value) || value.length > 10000) throw new Error("Review records must be a bounded array.");
  const sourceById = new Map(sources.map((item) => [item.id, item]));
  const ids = new Set<string>();
  return value.map((value, index) => {
    const raw = object(value, ["id", "base", "content", "review"], `Record ${index + 1}`);
    const id = text(raw.id, "Phrase ID", 300);
    const source = sourceById.get(id);
    if (!source) throw new Error(`Unknown phrase ID: ${id}`);
    if (ids.has(id)) throw new Error(`Duplicate phrase ID: ${id}`);
    ids.add(id);
    const rawBase = object(raw.base, [...contentKeys, "sourceHash"], `${id} base`);
    // Original sources may have missing script: reviewers must supply it in the edited content.
    for (const key of contentKeys) if (rawBase[key] !== sourceContent(source)[key as keyof ReviewContent]) throw new Error(`Stale source content: ${id}`);
    if (rawBase.sourceHash !== (source.automation?.sourceHash ?? null)) throw new Error(`Stale source fingerprint: ${id}`);
    const rawReview = object(raw.review, ["reviewer", "reviewedAt", "checks"], `${id} review`);
    const checks = object(rawReview.checks, ["meaning", "script", "romanization", "context"], `${id} checks`);
    if (Object.values(checks).some((value) => value !== true)) throw new Error(`All manual checks must be confirmed: ${id}`);
    const review: PublicationReview = { reviewer: text(rawReview.reviewer, "Reviewer", 120), reviewedAt: date(rawReview.reviewedAt, "Review date"), checks: { meaning: true, script: true, romanization: true, context: true } };
    return { id, base: { ...sourceContent(source), sourceHash: source.automation?.sourceHash ?? null }, content: content(raw.content, id), review };
  });
}
export function validateReviewBundle(value: unknown, sources: PhraseItem[]): ReviewBundle {
  const raw = object(value, ["format", "version", "exportedAt", "records"], "Review export");
  if (raw.format !== "kannada-buddy-review-export" || raw.version !== 1) throw new Error("Unsupported review export format or version.");
  const records = validateRecords(raw.records, sources);
  if (!records.length) throw new Error("The review export has no verified phrases.");
  const exportedAt = date(raw.exportedAt, "Export date");
  if (records.some((record) => Date.parse(record.review.reviewedAt) > Date.parse(exportedAt))) throw new Error("A review date is later than the export date.");
  return { format: "kannada-buddy-review-export", version: 1, exportedAt, records };
}
export function validatePublishedReviews(value: unknown, sources: PhraseItem[]): PublishedReviews {
  const raw = object(value, ["format", "version", "records"], "Published reviews");
  if (raw.format !== "kannada-buddy-published-reviews" || raw.version !== 1) throw new Error("Unsupported published review format or version.");
  return { format: "kannada-buddy-published-reviews", version: 1, records: validateRecords(raw.records, sources) };
}
export function mergePublishedReviews(existing: PublishedReviews, bundle: ReviewBundle): PublishedReviews {
  const records = new Map(existing.records.map((record) => [record.id, record]));
  for (const record of bundle.records) {
    const prior = records.get(record.id);
    if (prior && Date.parse(prior.review.reviewedAt) > Date.parse(record.review.reviewedAt)) throw new Error(`An older review cannot replace a newer publication: ${record.id}`);
    records.set(record.id, record);
  }
  return { format: "kannada-buddy-published-reviews", version: 1, records: [...records.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}
