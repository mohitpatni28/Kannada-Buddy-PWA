"use client";

import type { PhraseItem, PhraseStatus } from "@/lib/types";

const key = "kannada-buddy-library-overrides";

export type PhraseOverride = Partial<PhraseItem> & { id: string };

export function loadPhraseOverrides(): Record<string, PhraseOverride> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, PhraseOverride>;
  } catch {
    return {};
  }
}

export function mergeOverrides(phrases: PhraseItem[], overrides = loadPhraseOverrides()) {
  return phrases.map((phrase) => ({ ...phrase, ...(overrides[phrase.id] ?? {}) }));
}

export function updatePhraseOverride(id: string, patch: Partial<PhraseItem>) {
  const overrides = loadPhraseOverrides();
  overrides[id] = {
    ...(overrides[id] ?? { id }),
    ...patch,
    id,
    updatedAt: new Date().toISOString()
  };
  window.localStorage.setItem(key, JSON.stringify(overrides));
  return overrides[id];
}

export function setPhraseStatus(id: string, status: PhraseStatus) {
  return updatePhraseOverride(id, { status });
}
