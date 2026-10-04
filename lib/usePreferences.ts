"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getPreferencesSnapshot, parsePreferencesSnapshot, subscribePreferences } from "@/lib/preferences";

const getServerSnapshot = () => null;

export function usePreferences() {
  const snapshot = useSyncExternalStore(subscribePreferences, getPreferencesSnapshot, getServerSnapshot);
  return useMemo(() => parsePreferencesSnapshot(snapshot), [snapshot]);
}
