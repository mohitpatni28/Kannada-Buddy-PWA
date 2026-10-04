"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getLearningSnapshot, parseLearningSnapshot, subscribeLearning } from "@/lib/learningStore";

const getServerSnapshot = () => null;

export function useLearningState() {
  const snapshot = useSyncExternalStore(subscribeLearning, getLearningSnapshot, getServerSnapshot);
  return useMemo(() => parseLearningSnapshot(snapshot), [snapshot]);
}
