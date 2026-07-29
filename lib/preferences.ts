"use client";

import type { LearningPreferences } from "@/lib/types";

const preferenceKey = "kannada-buddy-learning-preferences-v2";

export function loadPreferences(): LearningPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(preferenceKey);
    if (!value) return null;
    const stored = JSON.parse(value) as Partial<LearningPreferences>;
    return {
      ...defaultSpeakingPreferences,
      ...stored,
      referenceDeck: stored.referenceDeck ?? "safe_ai_drafts"
    };
  } catch {
    return null;
  }
}

export function savePreferences(preferences: LearningPreferences) {
  window.localStorage.setItem(preferenceKey, JSON.stringify(preferences));
}

export const defaultSpeakingPreferences: LearningPreferences = {
  learningMode: "speaking",
  romanization: "always",
  sessionMinutes: 5,
  referenceDeck: "safe_ai_drafts"
};

export const defaultReadingPreferences: LearningPreferences = {
  learningMode: "speaking_and_reading",
  romanization: "when_needed",
  sessionMinutes: 5,
  referenceDeck: "safe_ai_drafts"
};
