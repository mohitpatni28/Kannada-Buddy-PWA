import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { learningConcepts } from "@/data/learning-concepts";
import { recordPractice, loadLearningState, parseLearningSnapshot } from "@/lib/learningStore";
import { activeLearningConcepts, isRetained, learningMetrics } from "@/lib/learningMetrics";
import { now, reviewed } from "./fixtures";
const id = learningConcepts[0].id;
const key = "kannada-buddy-learning-state-v2";
beforeEach(() => { localStorage.clear(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now)); });
afterEach(() => vi.useRealTimers());
function advance(days: number) { vi.setSystemTime(new Date(Date.now() + days * 86400000)); }
describe("honest progress evidence", () => {
  it("requires delayed scheduled recall on distinct days and a seven-day gap", () => {
    recordPractice(id, "independent", "read");
    advance(4);
    let state = recordPractice(id, "independent", "hinted");
    expect(isRetained(state.concepts[id].speakingRecall, state.concepts[id].nextReviewAt, Date.now())).toBe(false);
    advance(7);
    state = recordPractice(id, "independent", "read");
    expect(isRetained(state.concepts[id].speakingRecall, state.concepts[id].nextReviewAt, Date.now())).toBe(true);
    expect(isRetained(state.concepts[id].readingRecall, state.concepts[id].nextReviewAt, Date.now())).toBe(false);
    expect(state.evidence.at(-2)).toMatchObject({ scheduled: true, gapDays: 7 });
    advance(13);
    expect(isRetained(state.concepts[id].speakingRecall, state.concepts[id].nextReviewAt, Date.now())).toBe(false);
  });
  it("never treats corrective or same-day attempts as retained reviews", () => {
    recordPractice(id, "missed");
    let state = recordPractice(id, "independent", "read", { corrective: true });
    expect(state.concepts[id].speakingRecall?.days).toEqual([]);
    expect(state.evidence.at(-2)?.scheduled).toBe(false);
    advance(1);
    state = recordPractice(id, "independent");
    recordPractice(id, "independent");
    expect(loadLearningState().concepts[id].speakingRecall?.delayedSuccesses).toBe(1);
    expect(state.concepts[id].speakingRecall?.days).toHaveLength(1);
  });
  it("keeps existing legacy counts but never invents delayed evidence", () => {
    localStorage.setItem("kannada-buddy-progress", JSON.stringify({ [id]: reviewed(id) }));
    const state = loadLearningState();
    expect(state.concepts[id].successes).toBe(1);
    expect(isRetained(state.concepts[id].speakingRecall, state.concepts[id].nextReviewAt, Date.now())).toBe(false);
    expect(learningMetrics(learningConcepts, state, Date.now()).recent).toHaveLength(0);
  });
  it("persists lifetime totals beyond the 500-event detailed history", () => {
    for (let i = 0; i < 510; i++) recordPractice(id, "independent", "read");
    const state = parseLearningSnapshot(localStorage.getItem(key));
    const metrics = learningMetrics(learningConcepts, state, Date.now());
    expect(state.evidence).toHaveLength(500);
    expect(metrics.lifetime).toEqual({ speaking: 510, reading: 510, script: 0 });
    expect(metrics.recentTruncated).toBe(true);
  });
  it("excludes disabled AI decks and script pathway from active due counts", () => {
    const ai = activeLearningConcepts("ai_drafts_only")[0];
    recordPractice(id, "missed"); recordPractice(ai.id, "missed"); advance(2);
    const state = loadLearningState();
    state.orthography.fixture = { unitId: "fixture", attempts: 1, successes: 0, stabilityDays: 1, lastSeenAt: now, nextReviewAt: now };
    const core = learningMetrics(activeLearningConcepts("core_only"), state, Date.now());
    expect(core.due).toBe(1); expect(core.totalDue).toBe(1);
    expect(core.tiers.ai).toBe(0);
    expect(learningMetrics(activeLearningConcepts("ai_drafts_only"), state, Date.now(), true).totalDue).toBe(2);
    expect(core.new + core.learning + core.retained + core.due).toBe(core.total);
  });
  it("does not revive expired reading retention through speaking-only reviews", () => {
    recordPractice(id, "independent", "read"); advance(4);
    recordPractice(id, "independent", "read"); advance(7);
    let state = recordPractice(id, "independent", "read");
    const readingDeadline = state.concepts[id].readingNextReviewAt;
    expect(learningMetrics(learningConcepts, state, Date.now()).readingRetained).toBe(1);
    vi.setSystemTime(new Date(readingDeadline!));
    state = recordPractice(id, "independent", "skipped");
    expect(state.concepts[id].readingNextReviewAt).toBe(readingDeadline);
    expect(new Date(state.concepts[id].nextReviewAt).getTime()).toBeGreaterThan(Date.now());
    expect(learningMetrics(learningConcepts, state, Date.now()).readingRetained).toBe(0);
  });
  it("counts reading delay from its own last attempt, never the speaking timestamp", () => {
    recordPractice(id, "independent"); advance(4);
    const firstReading = recordPractice(id, "independent", "read");
    expect(firstReading.evidence.at(-1)).toMatchObject({ activity: "script_reading", scheduled: false, gapDays: 0 });
    advance(7);
    const state = recordPractice(id, "independent", "read");
    expect(state.concepts[id].readingRecall?.delayedSuccesses).toBe(1);
    expect(isRetained(state.concepts[id].readingRecall, state.concepts[id].nextReviewAt, Date.now())).toBe(false);
  });
});
