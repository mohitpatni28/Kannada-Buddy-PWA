import { describe, expect, it } from "vitest";
import { seedPhrases } from "@/data/seed-phrases";
import { createReviewRecord, createReviewBundle, validateReviewBundle, validatePublishedReviews, mergePublishedReviews } from "@/lib/reviewPublishing";

const source = seedPhrases[0];
const checked = { meaning: true, script: true, romanization: true, context: true } as const;
const at = "2026-09-01T10:00:00.000Z";
function bundle() { return createReviewBundle([createReviewRecord(source, { ...source, english: "Hello (polite)" }, "Reviewer A", at, checked)], at); }
const empty = { format: "kannada-buddy-published-reviews", version: 1, records: [] } as const;

describe("manual review publication validation", () => {
  it("preserves source identity and manual evidence while accepting edited text", () => {
    const result = validateReviewBundle(bundle(), seedPhrases);
    expect(result.records[0]).toMatchObject({ id: source.id, base: { english: "Hello", sourceHash: null }, content: { english: "Hello (polite)" }, review: { reviewer: "Reviewer A", checks: checked } });
    expect(validatePublishedReviews({ ...empty, records: result.records }, seedPhrases).records).toEqual(result.records);
  });
  it.each(["id", "base", "content", "review"])("rejects missing %s", (key) => {
    const value = JSON.parse(JSON.stringify(bundle()));
    delete value.records[0][key];
    expect(() => validateReviewBundle(value, seedPhrases)).toThrow(/incomplete/);
  });
  it("rejects stale source fields and source fingerprints", () => {
    const value = bundle();
    value.records[0].base.english = "Stale";
    expect(() => validateReviewBundle(value, seedPhrases)).toThrow(/Stale source content/);
    const fingerprint = bundle();
    fingerprint.records[0].base.sourceHash = "forged";
    expect(() => validateReviewBundle(fingerprint, seedPhrases)).toThrow(/fingerprint/);
  });
  it("rejects unknown and duplicate IDs and unverified checks", () => {
    const unknown = bundle(); unknown.records[0].id = "unknown";
    expect(() => validateReviewBundle(unknown, seedPhrases)).toThrow(/Unknown/);
    const duplicate = bundle(); duplicate.records.push(duplicate.records[0]);
    expect(() => validateReviewBundle(duplicate, seedPhrases)).toThrow(/Duplicate/);
    const unchecked = JSON.parse(JSON.stringify(bundle())); unchecked.records[0].review.checks.meaning = false;
    expect(() => validateReviewBundle(unchecked, seedPhrases)).toThrow(/manual checks/);
  });
  it.each([
    { key: "kannadaScript", value: "not Kannada" },
    { key: "english", value: "" },
    { key: "category", value: "../unsafe" },
    { key: "usageNote", value: "\u0000" },
    { key: "kannadaRoman", value: 12 }
  ])("rejects invalid edited $key", ({ key, value }) => {
    const raw = JSON.parse(JSON.stringify(bundle())); raw.records[0].content[key] = value;
    expect(() => validateReviewBundle(raw, seedPhrases)).toThrow();
  });
  it("rejects unsafe provenance/audio/prototype additions instead of trusting exported metadata", () => {
    for (const addition of [{ audioUrl: "https://evil.test" }, { sourceUrl: "javascript:bad" }, JSON.parse('{"__proto__":{"polluted":true}}')]) {
      const value = JSON.parse(JSON.stringify(bundle())); Object.assign(value.records[0].content, addition);
      // Object.assign handles __proto__ specially; use raw JSON for that dangerous key.
      if (Object.hasOwn(addition, "__proto__")) value.records[0].content = JSON.parse(JSON.stringify(bundle().records[0].content).replace(/}$/, ',"__proto__":{"polluted":true}}'));
      expect(() => validateReviewBundle(value, seedPhrases)).toThrow(/unsupported/);
    }
  });
  it("rejects invalid/future dates, empty reviewer and empty bundles", () => {
    for (const reviewedAt of ["yesterday", "2999-01-01T00:00:00.000Z", "2026-09-02T00:00:00.000Z", "2026-02-31T00:00:00.000Z"]) {
      const value = bundle(); value.records[0].review.reviewedAt = reviewedAt;
      expect(() => validateReviewBundle(value, seedPhrases)).toThrow();
    }
    const unnamed = bundle(); unnamed.records[0].review.reviewer = " ";
    expect(() => validateReviewBundle(unnamed, seedPhrases)).toThrow(/Reviewer/);
    expect(() => validateReviewBundle(createReviewBundle([], at), seedPhrases)).toThrow(/no verified/);
    expect(validatePublishedReviews(empty, seedPhrases).records).toEqual([]);
  });
  it("merges additions without duplicate IDs and rejects review downgrades", () => {
    const first = validateReviewBundle(bundle(), seedPhrases);
    const published = mergePublishedReviews(validatePublishedReviews(empty, seedPhrases), first);
    expect(mergePublishedReviews(published, first).records).toHaveLength(1);
    const older = bundle(); older.records[0].review.reviewedAt = "2026-08-01T00:00:00.000Z";
    expect(() => mergePublishedReviews(published, older)).toThrow(/older review/);
  });
});
