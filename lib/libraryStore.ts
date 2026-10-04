"use client";

import type { PhraseItem, PhraseStatus } from "@/lib/types";

const key = "kannada-buddy-library-overrides";
const changeEvent = "kannada-buddy-library-change";

export type PhraseOverride = Partial<PhraseItem> & { id: string };

export function getLibrarySnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function parseLibrarySnapshot(snapshot: string | null): Record<string, PhraseOverride> {
  try {
    const overrides: unknown = JSON.parse(snapshot ?? "{}");
    return overrides !== null && typeof overrides === "object" && !Array.isArray(overrides)
      ? overrides as Record<string, PhraseOverride>
      : {};
  } catch {
    return {};
  }
}

export function loadPhraseOverrides(): Record<string, PhraseOverride> {
  return parseLibrarySnapshot(getLibrarySnapshot());
}

export function subscribeLibrary(onChange: () => void): () => void {
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
  window.dispatchEvent(new Event(changeEvent));
  return overrides[id];
}

export function setPhraseStatus(id: string, status: PhraseStatus) {
  return updatePhraseOverride(id, { status });
}
