import { learningConcepts } from "@/data/learning-concepts";
import { adminLibraryPhrases } from "@/data/library-reference";
import { reviewedReferenceLearningConcepts, safeReferenceLearningConcepts } from "@/data/reference-learning-concepts";
import { coreScenarioByMission, courseScenarios, scenarioReferenceIds } from "@/data/course-scenarios";
import type { LearningConcept } from "@/lib/types";

export { courseScenarios } from "@/data/course-scenarios";

const referenceById = new Map([...safeReferenceLearningConcepts, ...reviewedReferenceLearningConcepts].map((concept) => [concept.id, concept]));
const publishedById = new Map(adminLibraryPhrases.filter((phrase) => phrase.publicationReview).map((phrase) => [phrase.id, phrase]));

export const selectedCourseReferenceConcepts = courseScenarios.flatMap((scenario) =>
  scenarioReferenceIds[scenario.id].map((id) => {
    const concept = referenceById.get(id);
    if (!concept) throw new Error(`Selected course phrase is not eligible for learning: ${id}`);
    return concept;
  })
);

// Keep the legacy core exports and their IDs intact for existing stored progress.
export const courseLearningConcepts: LearningConcept[] = [
  ...learningConcepts.map((concept) => {
    const scenario = courseScenarios.find((item) => item.id === coreScenarioByMission[concept.missionId]);
    if (!scenario) throw new Error(`Core course scenario is missing: ${concept.id}`);
    const published = publishedById.get(concept.id);
    if (!published?.publicationReview) return { ...concept, missionId: scenario.id, missionTitle: scenario.title };
    const formChanged = published.kannadaScript?.normalize("NFC") !== concept.form.kannadaScript
      || published.kannadaRoman !== concept.form.kannadaRoman;
    return {
      ...concept,
      intent: published.english,
      situation: published.usageNote || concept.situation,
      usageNote: published.usageNote,
      missionId: scenario.id,
      missionTitle: scenario.title,
      audioUrl: formChanged ? undefined : concept.audioUrl,
      pattern: formChanged ? undefined : concept.pattern,
      pronunciationNote: formChanged ? undefined : concept.pronunciationNote,
      form: {
        ...concept.form,
        kannadaScript: (published.kannadaScript ?? concept.form.kannadaScript).normalize("NFC"),
        kannadaRoman: published.kannadaRoman,
        review: {
          status: "reviewed" as const,
          source: "admin_review" as const,
          reviewer: published.publicationReview.reviewer,
          reviewedAt: published.publicationReview.reviewedAt
        }
      }
    };
  }),
  ...selectedCourseReferenceConcepts,
  ...reviewedReferenceLearningConcepts.filter((concept) => !selectedCourseReferenceConcepts.some((item) => item.id === concept.id))
];

export const courseSourcePhrases = new Map(
  adminLibraryPhrases
    .filter((phrase) => phrase.automation || phrase.publicationReview)
    .filter((phrase) => courseLearningConcepts.some((concept) => concept.id === phrase.id))
    .map((phrase) => [phrase.id, phrase])
);
