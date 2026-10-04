"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getLibrarySnapshot, mergeOverrides, parseLibrarySnapshot, subscribeLibrary } from "@/lib/libraryStore";
import type { PhraseItem } from "@/lib/types";

const getServerSnapshot = () => null;

export function useLibraryPhrases(phrases: PhraseItem[]) {
  const snapshot = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot, getServerSnapshot);
  return useMemo(() => mergeOverrides(phrases, parseLibrarySnapshot(snapshot)), [phrases, snapshot]);
}
