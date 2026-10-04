import { describe, expect, it } from "vitest";
import { courseLearningConcepts, courseScenarios, courseSourcePhrases, selectedCourseReferenceConcepts } from "@/data/course-catalog";
import { learningConcepts } from "@/data/learning-concepts";
import { automatedReferencePhrases } from "@/data/library-reference";
import { referenceConceptsFor } from "@/data/reference-learning-concepts";

describe("source-backed everyday course selection", () => {
  it("contains 100 distinct source IDs across eight populated situations", () => {
    expect(courseLearningConcepts).toHaveLength(100);
    expect(new Set(courseLearningConcepts.map((concept) => concept.id)).size).toBe(100);
    expect(courseScenarios).toHaveLength(8);
    for (const scenario of courseScenarios) {
      expect(courseLearningConcepts.filter((concept) => concept.missionId === scenario.id).length).toBeGreaterThan(0);
    }
  });

  it("preserves all original IDs, wording, review records and audio", () => {
    expect(learningConcepts).toHaveLength(16);
    for (const core of learningConcepts) {
      const selected = courseLearningConcepts.find((concept) => concept.id === core.id)!;
      expect({ ...selected, missionId: core.missionId, missionTitle: core.missionTitle }).toEqual(core);
      expect(selected.form.review.status).toBe("reviewed");
      expect(selected.audioUrl).toBeTruthy();
    }
  });

  it("copies 84 regular AI drafts exactly and preserves attribution without promoting review", () => {
    expect(selectedCourseReferenceConcepts).toHaveLength(84);
    expect(courseSourcePhrases.size).toBe(84);
    for (const concept of selectedCourseReferenceConcepts) {
      const phrase = automatedReferencePhrases.find((item) => item.id === concept.id)!;
      expect(phrase.status).toBe("ai_draft");
      expect(phrase.automation?.publicationEligibility).toBe("library_ai_draft");
      expect(concept.intent).toBe(phrase.english);
      expect(concept.form.kannadaRoman).toBe(phrase.kannadaRoman);
      expect(concept.form.kannadaScript).toBe(phrase.kannadaScript?.normalize("NFC"));
      expect(concept.usageNote).toBe(phrase.usageNote);
      expect(concept.form.review).toEqual({ status: "needs_native_review", source: "automated_reference_draft" });
      expect(concept.contentTier).toBe("ai_draft");
      expect(concept.audioUrl).toBeUndefined();
      expect(new URL(phrase.sourceUrl!).protocol).toBe("https:");
      expect(phrase.license).toContain("CC BY-SA");
    }
  });

  it("retains the existing preference opt-out and reference IDs for stored progress", () => {
    expect(referenceConceptsFor("core_only")).toEqual([]);
    for (const concept of selectedCourseReferenceConcepts) {
      expect(referenceConceptsFor("safe_ai_drafts").find((item) => item.id === concept.id)).toEqual(concept);
    }
  });
});
