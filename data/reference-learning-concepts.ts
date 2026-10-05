import { courseScenarios, selectedReferenceScenario } from "@/data/course-scenarios";
import { learningConcepts } from "@/data/learning-concepts";
import { adminLibraryPhrases, automatedReferencePhrases } from "@/data/library-reference";
import type { LearningConcept, PhraseItem, ReferenceDeckPreference } from "@/lib/types";

export function referencePhraseToLearningConcept(phrase: PhraseItem): LearningConcept {
  const automation = phrase.automation;
  if (!phrase.kannadaScript || (!automation && !phrase.publicationReview)) {
    throw new Error(`Reference learning phrase is incomplete: ${phrase.id}`);
  }

  const publishedScenarioByCategory: Record<string, string> = {
    basics: "everyday", family: "everyday", lodging: "home-stay", transport: "auto-travel",
    food: "food-counter", shop: "shopping", numbers: "shopping", time: "meeting-time", phone: "phone-calls"
  };
  const scenario = selectedReferenceScenario.get(phrase.id) ?? (phrase.publicationReview
    ? courseScenarios.find((item) => item.id === (publishedScenarioByCategory[phrase.category] ?? "everyday"))
    : undefined);

  return {
    id: phrase.id,
    intent: phrase.english,
    situation: phrase.usageNote || `Use this in a ${phrase.category.toLowerCase()} situation.`,
    missionId: scenario?.id ?? `reference-${phrase.category.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
    missionTitle: scenario?.title ?? phrase.category,
    usageNote: phrase.usageNote,
    contentTier: phrase.publicationReview ? "reviewed_reference" : phrase.status === "ai_draft_caution" ? "ai_draft_caution" : "ai_draft",
    sourceRisk: automation?.risk,
    form: {
      phraseId: phrase.id,
      kannadaScript: phrase.kannadaScript.normalize("NFC"),
      kannadaRoman: phrase.kannadaRoman,
      register: automation?.register ?? "neutral",
      variety: "standard-spoken",
      usePriority: "produce",
      review: phrase.publicationReview ? {
        status: "reviewed",
        source: "admin_review",
        reviewer: phrase.publicationReview.reviewer,
        reviewedAt: phrase.publicationReview.reviewedAt
      } : {
        status: "needs_native_review",
        source: "automated_reference_draft"
      }
    }
  };
}

const riskOrder = { low: 0, medium: 1, high: 2 };
const categoryOrder: Record<string, number> = {
  basics: 0,
  transport: 1,
  food: 2,
  shop: 3,
  lodging: 4,
  time: 5,
  phone: 6,
  family: 7,
  numbers: 8,
  emergency: 9,
  wikivoyage: 10
};

export const safeReferenceLearningConcepts = automatedReferencePhrases
  .filter((phrase) => phrase.status === "ai_draft")
  .sort((left, right) => {
    const riskDifference = riskOrder[left.automation!.risk] - riskOrder[right.automation!.risk];
    if (riskDifference !== 0) return riskDifference;
    const leftIsPhrase = left.english.trim().split(/\s+/).length > 1;
    const rightIsPhrase = right.english.trim().split(/\s+/).length > 1;
    if (leftIsPhrase !== rightIsPhrase) return leftIsPhrase ? -1 : 1;
    const categoryDifference =
      (categoryOrder[left.category] ?? 99) - (categoryOrder[right.category] ?? 99);
    if (categoryDifference !== 0) return categoryDifference;
    const issueDifference = left.automation!.issues.length - right.automation!.issues.length;
    if (issueDifference !== 0) return issueDifference;
    const confidenceDifference = right.automation!.draftConfidence - left.automation!.draftConfidence;
    if (confidenceDifference !== 0) return confidenceDifference;
    return 0;
  })
  .map(referencePhraseToLearningConcept);

export const cautionReferenceLearningConcepts = automatedReferencePhrases
  .filter((phrase) => phrase.status === "ai_draft_caution")
  .map(referencePhraseToLearningConcept);

export const reviewedReferenceLearningConcepts = adminLibraryPhrases
  .filter((phrase) => phrase.status === "approved" && phrase.publicationReview && !learningConcepts.some((concept) => concept.id === phrase.id))
  .map(referencePhraseToLearningConcept);

export const eligibleReferenceLearningConcepts = [
  ...safeReferenceLearningConcepts,
  ...cautionReferenceLearningConcepts
];

export function referenceConceptsFor(preference: ReferenceDeckPreference) {
  if (preference === "core_only") return reviewedReferenceLearningConcepts;
  if (preference === "ai_drafts_only") return safeReferenceLearningConcepts;
  return [...reviewedReferenceLearningConcepts, ...(preference === "all_eligible_ai_drafts"
    ? eligibleReferenceLearningConcepts : safeReferenceLearningConcepts)];
}
