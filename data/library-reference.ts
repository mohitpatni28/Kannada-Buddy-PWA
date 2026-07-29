import enrichmentData from "@/data/library-enrichment-all.json";
import { seedPhrases } from "@/data/seed-phrases";
import { wikivoyagePhrases } from "@/data/wikivoyage-phrases";
import type { PhraseAutomation, PhraseItem, PhraseStatus } from "@/lib/types";

type EnrichmentItem = {
  sourceId: string;
  sourceOccurrence: number;
  draftId: string;
  sourceHash: string;
  sourcePhrase: PhraseAutomation["sourcePhrase"];
  draft: {
    english: string;
    kannadaScript: string;
    kannadaRoman: string;
    category: string;
    tags: string[];
    register: PhraseAutomation["register"];
    bengaluruNaturalness: PhraseAutomation["bengaluruNaturalness"];
    usageContext: string;
  };
  assessment: {
    risk: PhraseAutomation["risk"];
    issues: string[];
    draftConfidence: number;
  };
  reviewQueue: PhraseAutomation["reviewQueue"];
  publicationEligibility: PhraseAutomation["publicationEligibility"];
  reviewClaim: PhraseAutomation["reviewClaim"];
};

type EnrichmentArtifact = {
  artifactStatus: "non_canonical_ai_draft";
  items: EnrichmentItem[];
};

const artifact = enrichmentData as unknown as EnrichmentArtifact;
const sourceOccurrenceCounts = new Map<string, number>();
const sourceByDraftId = new Map<string, PhraseItem>();

for (const phrase of wikivoyagePhrases) {
  const occurrence = (sourceOccurrenceCounts.get(phrase.id) ?? 0) + 1;
  sourceOccurrenceCounts.set(phrase.id, occurrence);
  sourceByDraftId.set(`${phrase.id}#${occurrence}`, phrase);
}

function statusFor(item: EnrichmentItem): PhraseStatus {
  if (item.publicationEligibility === "hold_for_human_review") return "human_review_required";
  if (item.publicationEligibility === "library_ai_draft_caution") return "ai_draft_caution";
  return "ai_draft";
}

function toReferencePhrase(item: EnrichmentItem): PhraseItem {
  const source = sourceByDraftId.get(item.draftId);
  if (!source) throw new Error(`Enrichment source is missing: ${item.draftId}`);
  return {
    ...source,
    id: item.draftId,
    english: item.draft.english,
    kannadaScript: item.draft.kannadaScript,
    kannadaRoman: item.draft.kannadaRoman,
    category: item.draft.category,
    tags: item.draft.tags,
    usageNote: item.draft.usageContext,
    status: statusFor(item),
    isBengaluruPractical: false,
    automation: {
      draftId: item.draftId,
      sourceId: item.sourceId,
      sourceOccurrence: item.sourceOccurrence,
      sourceHash: item.sourceHash,
      risk: item.assessment.risk,
      issues: item.assessment.issues,
      draftConfidence: item.assessment.draftConfidence,
      reviewQueue: item.reviewQueue,
      publicationEligibility: item.publicationEligibility,
      reviewClaim: item.reviewClaim,
      register: item.draft.register,
      bengaluruNaturalness: item.draft.bengaluruNaturalness,
      sourcePhrase: item.sourcePhrase
    }
  };
}

export const automatedReferencePhrases = artifact.items.map(toReferencePhrase);
export const safeAutomatedReferencePhrases = automatedReferencePhrases.filter(
  (phrase) => phrase.status !== "human_review_required"
);

export const libraryPhrases: PhraseItem[] = [
  ...seedPhrases.filter((phrase) => phrase.status === "approved"),
  ...safeAutomatedReferencePhrases
];

export const adminLibraryPhrases: PhraseItem[] = [
  ...seedPhrases,
  ...automatedReferencePhrases
];

export const libraryDraftCounts = {
  safe: safeAutomatedReferencePhrases.length,
  caution: automatedReferencePhrases.filter((phrase) => phrase.status === "ai_draft_caution").length,
  held: automatedReferencePhrases.filter((phrase) => phrase.status === "human_review_required").length,
  priority: automatedReferencePhrases.filter(
    (phrase) => phrase.automation?.reviewQueue === "priority_human_review"
  ).length
};
