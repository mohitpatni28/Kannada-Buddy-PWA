import { afterEach, describe, expect, it, vi } from "vitest";
import { sourceLibraryPhrases, applyPublishedReviews } from "@/data/library-reference";
import { scenarioReferenceIds } from "@/data/course-scenarios";
import { learningConcepts } from "@/data/learning-concepts";
import { sourceContent, type ReviewRecord } from "@/lib/reviewPublishing";

const reviewedAt = "2026-10-04T12:00:00.000Z";
function recordFor(id: string): ReviewRecord {
  const source = sourceLibraryPhrases.find((phrase) => phrase.id === id)!;
  return {
    id,
    base: { ...sourceContent(source), sourceHash: source.automation?.sourceHash ?? null },
    content: { ...sourceContent(source), english: `${source.english} (reviewed)` },
    review: { reviewer: "Test editor", reviewedAt, checks: { meaning: true, script: true, romanization: true, context: true } }
  };
}

afterEach(() => {
  vi.doUnmock("@/data/published-phrases.json");
  vi.resetModules();
});

async function publishedCatalog(records: ReviewRecord[]) {
  vi.resetModules();
  vi.doMock("@/data/published-phrases.json", () => ({ default: {
    format: "kannada-buddy-published-reviews", version: 1, records
  } }));
  const library = await import("@/data/library-reference");
  const catalog = await import("@/data/course-catalog");
  const metrics = await import("@/lib/learningMetrics");
  return { ...library, ...catalog, ...metrics };
}

describe("published reviews reach public learning content", () => {
  it("applies reviewed text without changing identity, original provenance, or AI assessment", () => {
    const source = sourceLibraryPhrases.find((phrase) => phrase.automation)!;
    const record = recordFor(source.id);
    const result = applyPublishedReviews([source], [record])[0];
    expect(result.id).toBe(source.id);
    expect(result.english).toBe(record.content.english);
    expect(result.status).toBe("approved");
    expect(result.publicationReview).toEqual(record.review);
    expect(result.automation).toEqual(source.automation);
    expect(result.sourceUrl).toBe(source.sourceUrl);
    expect(result.license).toBe(source.license);
    expect(source.publicationReview).toBeUndefined();
    expect(applyPublishedReviews([source], [])).toEqual([source]);
  });

  it("promotes a held source into the shared Library, course and reviewed-only practice without inventing audio or native review", async () => {
    const held = sourceLibraryPhrases.find((phrase) => phrase.status === "human_review_required" && phrase.kannadaScript)!;
    const record = recordFor(held.id);
    const published = await publishedCatalog([record]);
    expect(published.libraryPhrases.find((phrase) => phrase.id === held.id)?.english).toBe(record.content.english);
    const concept = published.courseLearningConcepts.find((item) => item.id === held.id)!;
    expect(published.courseLearningConcepts).toHaveLength(101);
    expect(concept.contentTier).toBe("reviewed_reference");
    expect(concept.form.review).toEqual({ status: "reviewed", source: "admin_review", reviewer: "Test editor", reviewedAt });
    expect(concept.audioUrl).toBeUndefined();
    expect(published.courseSourcePhrases.get(held.id)?.sourceUrl).toBe(held.sourceUrl);
    expect(published.activeLearningConcepts("core_only").map((item) => item.id)).toContain(held.id);
    expect(published.activeLearningConcepts("ai_drafts_only").map((item) => item.id)).not.toContain(held.id);
    expect(published.learningMetrics([concept], { concepts: {}, orthography: {}, evidence: [] }, Date.parse(reviewedAt)).tiers).toEqual({ core: 1, ai: 0 });
  });

  it("replaces a selected course draft in place and keeps sessions deduplicated across preferences", async () => {
    const id = scenarioReferenceIds.everyday[0];
    const record = recordFor(id);
    const published = await publishedCatalog([record]);
    expect(published.courseLearningConcepts).toHaveLength(100);
    expect(published.selectedCourseReferenceConcepts.find((item) => item.id === id)?.intent).toBe(record.content.english);
    for (const preference of ["core_only", "safe_ai_drafts", "all_eligible_ai_drafts", "ai_drafts_only"] as const) {
      const concepts = published.activeLearningConcepts(preference);
      expect(new Set(concepts.map((concept) => concept.id)).size).toBe(concepts.length);
      expect(concepts.some((concept) => concept.id === id)).toBe(preference !== "ai_drafts_only");
    }
  });

  it("rejects a stale shared artifact before it can enter public catalogs", async () => {
    const record = recordFor(scenarioReferenceIds.everyday[0]);
    record.base.english = "stale source";
    await expect(publishedCatalog([record])).rejects.toThrow("Stale source content");
  });

  it("also adds manually reviewed seed references without requiring AI metadata", async () => {
    const seed = sourceLibraryPhrases.find((phrase) => !phrase.automation && phrase.kannadaScript && !learningConcepts.some((concept) => concept.id === phrase.id))!;
    const published = await publishedCatalog([recordFor(seed.id)]);
    const concept = published.courseLearningConcepts.find((item) => item.id === seed.id)!;
    expect(concept.form.review.source).toBe("admin_review");
    expect(concept.sourceRisk).toBeUndefined();
    expect(published.activeLearningConcepts("core_only").some((item) => item.id === seed.id)).toBe(true);
  });

  it("updates original course phrases in place and drops recordings and teaching hints when the spoken form changes", async () => {
    const core = learningConcepts[0];
    const record = recordFor(core.id);
    record.content.kannadaRoman = `${record.content.kannadaRoman} changed`;
    const published = await publishedCatalog([record]);
    expect(published.courseLearningConcepts).toHaveLength(100);
    const concept = published.courseLearningConcepts.find((item) => item.id === core.id)!;
    expect(concept.intent).toBe(record.content.english);
    expect(concept.form.kannadaRoman).toBe(record.content.kannadaRoman);
    expect(concept.form.review.source).toBe("admin_review");
    expect(concept.audioUrl).toBeUndefined();
    expect(concept.pattern).toBeUndefined();
    expect(concept.pronunciationNote).toBeUndefined();
    expect(core.audioUrl).toBeTruthy();
    const deck = published.activeLearningConcepts("core_only");
    expect(deck).toHaveLength(16);
    expect(new Set(deck.map((item) => item.id)).size).toBe(deck.length);
    expect(deck.find((item) => item.id === core.id)?.form.kannadaRoman).toBe(record.content.kannadaRoman);
  });

  it("keeps the packaged recording for an approved core phrase with unchanged Kannada form", async () => {
    const core = learningConcepts[0];
    const record = recordFor(core.id);
    record.content.kannadaRoman = core.form.kannadaRoman;
    record.content.kannadaScript = core.form.kannadaScript;
    const published = await publishedCatalog([record]);
    expect(published.courseLearningConcepts.find((item) => item.id === core.id)?.audioUrl).toBe(core.audioUrl);
  });
});
