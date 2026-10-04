import { learningConcepts } from "@/data/learning-concepts";
import { automatedReferencePhrases } from "@/data/library-reference";
import { safeReferenceLearningConcepts } from "@/data/reference-learning-concepts";
import { coreScenarioByMission, courseScenarios, scenarioReferenceIds } from "@/data/course-scenarios";
import type { LearningConcept } from "@/lib/types";

export { courseScenarios } from "@/data/course-scenarios";

const referenceById = new Map(safeReferenceLearningConcepts.map((concept) => [concept.id, concept]));

export const selectedCourseReferenceConcepts = courseScenarios.flatMap((scenario) =>
  scenarioReferenceIds[scenario.id].map((id) => {
    const concept = referenceById.get(id);
    if (!concept) throw new Error(`Selected course phrase is not an eligible regular AI draft: ${id}`);
    return concept;
  })
);

// Keep the legacy core exports and their IDs intact for existing stored progress.
export const courseLearningConcepts: LearningConcept[] = [
  ...learningConcepts.map((concept) => {
    const scenario = courseScenarios.find((item) => item.id === coreScenarioByMission[concept.missionId]);
    if (!scenario) throw new Error(`Core course scenario is missing: ${concept.id}`);
    return { ...concept, missionId: scenario.id, missionTitle: scenario.title };
  }),
  ...selectedCourseReferenceConcepts
];

export const courseSourcePhrases = new Map(
  automatedReferencePhrases
    .filter((phrase) => selectedCourseReferenceConcepts.some((concept) => concept.id === phrase.id))
    .map((phrase) => [phrase.id, phrase])
);
