import type { PhraseItem, ReviewProgress } from "@/lib/types";

export const now = "2026-10-04T06:00:00.000Z";
export const phrases: PhraseItem[] = [
  { id: "hello", english: "Hello fixture", kannadaRoman: "Namaskara", category: "greetings", tags: [], difficulty: "easy", source: "manual", status: "approved", isBengaluruPractical: true, createdAt: now, updatedAt: now },
  { id: "thanks", english: "Thanks fixture", kannadaRoman: "Dhanyavada", category: "greetings", tags: [], difficulty: "easy", source: "manual", status: "approved", isBengaluruPractical: true, createdAt: now, updatedAt: now },
  { id: "raw", english: "Raw fixture", kannadaRoman: "Candidate", category: "greetings", tags: [], difficulty: "easy", source: "other", status: "raw_imported", isBengaluruPractical: false, createdAt: now, updatedAt: now }
];

export function reviewed(phraseId: string, nextReviewAt = "2026-10-11T06:00:00.000Z"): ReviewProgress {
  return { phraseId, confidence: 3, lastSeenAt: now, nextReviewAt, correctCount: 1, wrongCount: 0 };
}

export const adminPhrases: PhraseItem[] = phrases.map((phrase) => phrase.id !== "raw" ? phrase : {
  ...phrase,
  automation: {
    draftId: "fixture-draft", sourceId: "fixture-source", sourceOccurrence: 1, sourceHash: "fixture-hash",
    risk: "high", issues: [], draftConfidence: 0.6, reviewQueue: "priority_human_review",
    publicationEligibility: "hold_for_human_review", reviewClaim: "not_human_or_native_reviewed",
    register: "polite", bengaluruNaturalness: "unverified",
    sourcePhrase: { english: "Immutable source fixture", kannadaRoman: "Original candidate", kannadaScript: "", category: "greetings", tags: [] }
  }
});
