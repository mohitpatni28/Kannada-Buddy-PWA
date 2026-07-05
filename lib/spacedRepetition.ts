import type { ReviewProgress } from "@/lib/types";

const dayMs = 24 * 60 * 60 * 1000;

export function nextReviewDate(confidence: 1 | 2 | 3, from = new Date()) {
  const days = confidence === 1 ? 1 : confidence === 2 ? 3 : 7;
  return new Date(from.getTime() + days * dayMs).toISOString();
}

export function scorePhrase(phraseId: string, confidence: 1 | 2 | 3, previous?: ReviewProgress): ReviewProgress {
  const now = new Date().toISOString();
  return {
    phraseId,
    confidence,
    lastSeenAt: now,
    nextReviewAt: nextReviewDate(confidence),
    correctCount: (previous?.correctCount ?? 0) + (confidence === 3 ? 1 : 0),
    wrongCount: (previous?.wrongCount ?? 0) + (confidence === 1 ? 1 : 0)
  };
}

export function isDue(progress?: ReviewProgress, at = new Date()) {
  if (!progress) return true;
  return new Date(progress.nextReviewAt).getTime() <= at.getTime();
}
