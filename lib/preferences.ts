"use client";

import type { LearningPreferences } from "@/lib/types";

const preferenceKey = "kannada-buddy-learning-preferences-v2";
const changeEvent = "kannada-buddy-preferences-change";

export function loadPreferences(): LearningPreferences | null {
  return parsePreferencesSnapshot(getPreferencesSnapshot());
}

export function savePreferences(preferences: LearningPreferences) {
  window.localStorage.setItem(preferenceKey, JSON.stringify(preferences));
  window.dispatchEvent(new Event(changeEvent));
}

export function getPreferencesSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(preferenceKey);
  } catch {
    return null;
  }
}

export function parsePreferencesSnapshot(snapshot: string | null): LearningPreferences | null {
  if (snapshot === null) return null;
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const stored = value as Partial<LearningPreferences>;
    return { ...defaultSpeakingPreferences, ...stored, referenceDeck: stored.referenceDeck ?? "safe_ai_drafts" };
  } catch {
    return null;
  }
}

export function subscribePreferences(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key !== preferenceKey && event.key !== null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
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
