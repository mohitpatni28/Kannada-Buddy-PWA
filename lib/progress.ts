"use client";

import type { ReviewProgress } from "@/lib/types";
import { scorePhrase } from "@/lib/spacedRepetition";

const key = "kannada-buddy-progress";
const changeEvent = "kannada-buddy-progress-change";

export function getProgressSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function parseProgressSnapshot(snapshot: string | null): Record<string, ReviewProgress> {
  try {
    const progress: unknown = JSON.parse(snapshot ?? "{}");
    return progress !== null && typeof progress === "object" && !Array.isArray(progress)
      ? progress as Record<string, ReviewProgress>
      : {};
  } catch {
    return {};
  }
}

export function loadProgress(): Record<string, ReviewProgress> {
  return parseProgressSnapshot(getProgressSnapshot());
}

export function subscribeProgress(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      // Storage access can be denied by browser privacy settings.
      return;
    }
    onChange();
  };
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveProgress(progress: Record<string, ReviewProgress>) {
  window.localStorage.setItem(key, JSON.stringify(progress));
  window.dispatchEvent(new Event(changeEvent));
}

export function ratePhrase(phraseId: string, confidence: 1 | 2 | 3) {
  const progress = loadProgress();
  progress[phraseId] = scorePhrase(phraseId, confidence, progress[phraseId]);
  saveProgress(progress);
  return progress[phraseId];
}
