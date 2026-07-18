"use client";

import { learningConcepts } from "@/data/learning-concepts";
import type {
  ConceptProgress,
  LearningConcept,
  LearningEvidence,
  LearningState,
  OrthographyProgress,
  OrthographyUnit,
  PracticeOutcome,
  ReadingOutcome,
  ReviewProgress
} from "@/lib/types";

const learningKey = "kannada-buddy-learning-state-v2";
const legacyKey = "kannada-buddy-progress";
const dayMs = 24 * 60 * 60 * 1000;

const newEmptyState = (): LearningState => ({ concepts: {}, orthography: {}, evidence: [] });

function normalizeState(value: Partial<LearningState>): LearningState {
  return {
    concepts: value.concepts ?? {},
    orthography: value.orthography ?? {},
    evidence: value.evidence ?? []
  };
}

function migrateLegacyProgress(): LearningState | null {
  const raw = window.localStorage.getItem(legacyKey);
  if (!raw) return null;

  try {
    const legacy = JSON.parse(raw) as Record<string, ReviewProgress>;
    const knownConceptIds = new Set(learningConcepts.map((concept) => concept.id));
    const concepts: Record<string, ConceptProgress> = {};
    const evidence: LearningEvidence[] = [];

    Object.values(legacy).forEach((item) => {
      if (!knownConceptIds.has(item.phraseId)) return;
      const attempts = Math.max(1, item.correctCount + item.wrongCount);
      const stabilityDays = item.confidence === 3 ? 7 : item.confidence === 2 ? 3 : 1;
      concepts[item.phraseId] = {
        conceptId: item.phraseId,
        attempts,
        successes: item.correctCount,
        lapses: item.wrongCount,
        stabilityDays,
        lastSeenAt: item.lastSeenAt,
        nextReviewAt: item.nextReviewAt,
        readingAttempts: 0,
        readingSuccesses: 0
      };
      evidence.push({
        conceptId: item.phraseId,
        activity: "cued_production",
        outcome: item.confidence === 3 ? "independent" : item.confidence === 2 ? "hinted" : "missed",
        hintsUsed: item.confidence === 3 ? 0 : 1,
        occurredAt: item.lastSeenAt,
        migrated: true
      });
    });

    if (Object.keys(concepts).length === 0) return null;
    const migrated = { concepts, orthography: {}, evidence };
    window.localStorage.setItem(learningKey, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

export function loadLearningState(): LearningState {
  if (typeof window === "undefined") return newEmptyState();
  try {
    const stored = window.localStorage.getItem(learningKey);
    if (stored) return normalizeState(JSON.parse(stored) as Partial<LearningState>);
    return migrateLegacyProgress() ?? newEmptyState();
  } catch {
    return newEmptyState();
  }
}

function saveLearningState(state: LearningState) {
  window.localStorage.setItem(learningKey, JSON.stringify(state));
}

function intervalFor(outcome: PracticeOutcome, previous?: ConceptProgress, corrective = false) {
  const previousStability = previous?.stabilityDays ?? 0;
  if (corrective) {
    if (outcome === "independent") return { days: 1, stability: Math.max(1.5, previousStability) };
    return { days: 1, stability: 1 };
  }
  if (outcome === "missed") return { days: 1, stability: Math.max(1, previousStability * 0.45) };
  if (outcome === "hinted") return { days: previousStability >= 3 ? 2 : 1, stability: Math.max(1.5, previousStability * 0.8) };
  const stability = previousStability === 0 ? 4 : Math.min(60, Math.max(4, previousStability * 1.75));
  return { days: Math.max(4, Math.round(stability)), stability };
}

export function recordPractice(
  conceptId: string,
  outcome: PracticeOutcome,
  reading?: ReadingOutcome,
  options: { corrective?: boolean } = {}
) {
  const state = loadLearningState();
  const previous = state.concepts[conceptId];
  const now = new Date();
  const interval = intervalFor(outcome, previous, options.corrective);
  const next: ConceptProgress = {
    conceptId,
    attempts: (previous?.attempts ?? 0) + 1,
    successes: (previous?.successes ?? 0) + (outcome === "independent" ? 1 : 0),
    lapses: (previous?.lapses ?? 0) + (outcome === "missed" ? 1 : 0),
    stabilityDays: interval.stability,
    lastSeenAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + interval.days * dayMs).toISOString(),
    readingAttempts: (previous?.readingAttempts ?? 0) + (reading && reading !== "skipped" ? 1 : 0),
    readingSuccesses: (previous?.readingSuccesses ?? 0) + (reading === "read" ? 1 : 0)
  };
  const evidence: LearningEvidence[] = [
    ...state.evidence,
    {
      conceptId,
      activity: "cued_production" as const,
      outcome,
      hintsUsed: outcome === "independent" ? 0 : 1,
      occurredAt: now.toISOString(),
      corrective: options.corrective
    },
    ...(reading && reading !== "skipped"
      ? [{
          conceptId,
          activity: "script_reading" as const,
          outcome: reading,
          hintsUsed: reading === "read" ? 0 : 1,
          occurredAt: now.toISOString(),
          corrective: options.corrective
        }]
      : [])
  ].slice(-500);
  const updated = { ...state, concepts: { ...state.concepts, [conceptId]: next }, evidence };
  saveLearningState(updated);
  return updated;
}

export function recordOrthography(unitId: string, outcome: PracticeOutcome) {
  const state = loadLearningState();
  const previous = state.orthography[unitId];
  const now = new Date();
  const previousStability = previous?.stabilityDays ?? 0;
  const stabilityDays = outcome === "independent"
    ? previousStability === 0 ? 3 : Math.min(45, Math.max(3, previousStability * 1.7))
    : outcome === "hinted" ? Math.max(1, previousStability * 0.7) : 1;
  const reviewDays = outcome === "independent" ? Math.round(stabilityDays) : 1;
  const next: OrthographyProgress = {
    unitId,
    attempts: (previous?.attempts ?? 0) + 1,
    successes: (previous?.successes ?? 0) + (outcome === "independent" ? 1 : 0),
    stabilityDays,
    lastSeenAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + reviewDays * dayMs).toISOString()
  };
  const evidence: LearningEvidence[] = [
    ...state.evidence,
    {
      conceptId: `orthography:${unitId}`,
      activity: "grapheme_recognition" as const,
      outcome,
      hintsUsed: outcome === "independent" ? 0 : 1,
      occurredAt: now.toISOString()
    }
  ].slice(-500);
  const updated = { ...state, orthography: { ...state.orthography, [unitId]: next }, evidence };
  saveLearningState(updated);
  return updated;
}

export function selectOrthographyUnit(units: OrthographyUnit[], state: LearningState, now = new Date()) {
  const ordered = [...units].sort((a, b) => a.order - b.order);
  const due = ordered
    .filter((item) => state.orthography[item.id] && new Date(state.orthography[item.id].nextReviewAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(state.orthography[a.id].nextReviewAt).getTime() - new Date(state.orthography[b.id].nextReviewAt).getTime());
  return due[0] ?? ordered.find((item) => !state.orthography[item.id]);
}

export function selectSessionConcepts(concepts: LearningConcept[], state: LearningState, sessionMinutes: number, now = new Date()) {
  const limit = sessionMinutes === 15 ? 10 : sessionMinutes === 10 ? 7 : 4;
  const due = concepts
    .filter((item) => state.concepts[item.id] && new Date(state.concepts[item.id].nextReviewAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(state.concepts[a.id].nextReviewAt).getTime() - new Date(state.concepts[b.id].nextReviewAt).getTime());
  const unseen = concepts.filter((item) => !state.concepts[item.id]).slice(0, Math.min(3, Math.max(0, limit - due.length)));
  return [...due, ...unseen].slice(0, limit);
}
