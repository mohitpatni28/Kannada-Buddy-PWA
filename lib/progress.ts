"use client";

import type { ReviewProgress } from "@/lib/types";
import { scorePhrase } from "@/lib/spacedRepetition";

const key = "kannada-buddy-progress";

export function loadProgress(): Record<string, ReviewProgress> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, ReviewProgress>;
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, ReviewProgress>) {
  window.localStorage.setItem(key, JSON.stringify(progress));
}

export function ratePhrase(phraseId: string, confidence: 1 | 2 | 3) {
  const progress = loadProgress();
  progress[phraseId] = scorePhrase(phraseId, confidence, progress[phraseId]);
  saveProgress(progress);
  return progress[phraseId];
}
