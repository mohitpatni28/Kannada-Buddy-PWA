import { courseLearningConcepts, selectedCourseReferenceConcepts } from "@/data/course-catalog";
import { referenceConceptsFor } from "@/data/reference-learning-concepts";
import type { LearningConcept, LearningPreferences, LearningState, RecallEvidence } from "@/lib/types";

const dayMs = 86_400_000;
export const retentionPolicy = { distinctDays: 2, minimumGapDays: 7 };
export function activeLearningConcepts(preference: LearningPreferences["referenceDeck"]) {
  const references = referenceConceptsFor(preference);
  const eligibleIds = new Set(references.map((concept) => concept.id));
  const selected = selectedCourseReferenceConcepts.filter((concept) => eligibleIds.has(concept.id));
  const selectedIds = new Set(selected.map((concept) => concept.id));
  const core = preference === "ai_drafts_only" ? [] : courseLearningConcepts.filter((concept) => concept.contentTier === "core");
  return [...core, ...selected, ...references.filter((concept) => !selectedIds.has(concept.id))];
}
export function isRetained(recall: RecallEvidence | undefined, nextReviewAt: string, now: number, policy = retentionPolicy) {
  return Boolean(recall && new Set(recall.days).size >= policy.distinctDays
    && recall.lastGapDays >= policy.minimumGapDays
    && (recall.lastOutcome === "independent" || recall.lastOutcome === "read")
    && new Date(nextReviewAt).getTime() > now);
}
export function learningMetrics(concepts: LearningConcept[], state: LearningState, now: number, includeScript = false) {
  const counts = { total: concepts.length, new: 0, learning: 0, retained: 0, due: 0, readingStarted: 0, readingRetained: 0 };
  const tiers = { core: 0, ai: 0 };
  const missions: Record<string, { title: string; total: number; started: number; retained: number; due: number }> = {};
  const upcoming: Array<{ id: string; title: string; at: string }> = [];
  for (const concept of concepts) {
    tiers[!concept.contentTier || concept.contentTier === "core" ? "core" : "ai"]++;
    const mission = missions[concept.missionId] ??= { title: concept.missionTitle, total: 0, started: 0, retained: 0, due: 0 };
    mission.total++;
    const progress = state.concepts[concept.id];
    if (!progress) { counts.new++; continue; }
    mission.started++;
    const due = new Date(progress.nextReviewAt).getTime() <= now;
    const retained = isRetained(progress.speakingRecall, progress.nextReviewAt, now);
    if (due) { counts.due++; mission.due++; }
    else if (retained) { counts.retained++; mission.retained++; }
    else counts.learning++;
    if (progress.readingAttempts > 0) counts.readingStarted++;
    if (progress.readingNextReviewAt && isRetained(progress.readingRecall, progress.readingNextReviewAt, now)) counts.readingRetained++;
    if (!due) upcoming.push({ id: concept.id, title: concept.intent, at: progress.nextReviewAt });
  }
  const scriptDue = includeScript ? Object.values(state.orthography).filter((item) => new Date(item.nextReviewAt).getTime() <= now).length : 0;
  const lifetime = {
    speaking: Object.values(state.concepts).reduce((total, item) => total + item.attempts, 0),
    reading: Object.values(state.concepts).reduce((total, item) => total + item.readingAttempts, 0),
    script: Object.values(state.orthography).reduce((total, item) => total + item.attempts, 0)
  };
  const recent = state.evidence.filter((event) => !event.migrated && new Date(event.occurredAt).getTime() > now - 7 * dayMs && new Date(event.occurredAt).getTime() <= now);
  return { ...counts, tiers, missions: Object.values(missions), scriptDue, totalDue: counts.due + scriptDue, lifetime, recent,
    recentTruncated: state.evidence.length >= 500 && state.evidence[0] && new Date(state.evidence[0].occurredAt).getTime() > now - 7 * dayMs,
    upcoming: upcoming.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(0, 5) };
}
