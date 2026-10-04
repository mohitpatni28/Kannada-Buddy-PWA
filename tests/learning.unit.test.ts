import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { learningConcepts } from "@/data/learning-concepts";
import { getLearningSnapshot, loadLearningState, parseLearningSnapshot, recordPractice, subscribeLearning } from "@/lib/learningStore";
import { now, reviewed } from "./fixtures";

const key = "kannada-buddy-learning-state-v2";
const legacyKey = "kannada-buddy-progress";
const empty = { concepts: {}, orthography: {}, evidence: [] };
const conceptId = learningConcepts[0].id;
beforeEach(() => { window.localStorage.clear(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now)); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("adaptive learning external store", () => {
  it.each([null, "{broken", "null", "[]", "17", '"text"'])("safely parses unsupported %s snapshots", (raw) => {
    expect(parseLearningSnapshot(raw)).toEqual(empty);
  });

  it("normalizes partial legacy-v2 state and preserves existing evidence", () => {
    expect(parseLearningSnapshot('{"concepts":{}}')).toEqual(empty);
    expect(parseLearningSnapshot('{"concepts":[],"orthography":17,"evidence":{}}')).toEqual(empty);
    const stored = recordPractice(conceptId, "independent");
    expect(parseLearningSnapshot(getLearningSnapshot())).toEqual(stored);
    expect(loadLearningState()).toEqual(stored);
  });

  it("snapshot reads do not mutate legacy data; subscribing migrates it without erasing the original", () => {
    const legacy = JSON.stringify({ [conceptId]: reviewed(conceptId), unknown: reviewed("unknown") });
    window.localStorage.setItem(legacyKey, legacy);
    expect(parseLearningSnapshot(getLearningSnapshot()).concepts[conceptId]).toMatchObject({ conceptId, stabilityDays: 7 });
    expect(getLearningSnapshot()).toBe(getLearningSnapshot());
    expect(window.localStorage.getItem(key)).toBeNull();
    const unsubscribe = subscribeLearning(vi.fn());
    try {
      const state = parseLearningSnapshot(getLearningSnapshot());
      expect(state.concepts[conceptId]).toMatchObject({ conceptId, attempts: 1, successes: 1, stabilityDays: 7 });
      expect(state.concepts.unknown).toBeUndefined();
      expect(state.evidence).toHaveLength(1);
      expect(state.evidence[0].migrated).toBe(true);
      expect(window.localStorage.getItem(legacyKey)).toBe(legacy);
    } finally { unsubscribe(); }
  });

  it("has safe server reads and subscriptions", () => {
    vi.stubGlobal("window", undefined);
    expect(getLearningSnapshot()).toBeNull();
    expect(loadLearningState()).toEqual(empty);
    expect(() => subscribeLearning(vi.fn())()).not.toThrow();
  });

  it("handles denied storage reads and getter access", () => {
    const storage = window.localStorage;
    const listener = vi.fn();
    const unsubscribe = subscribeLearning(listener);
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    try {
      expect(getLearningSnapshot()).toBeNull();
      expect(loadLearningState()).toEqual(empty);
      window.dispatchEvent(new StorageEvent("storage", { key, storageArea: storage }));
      expect(listener).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });

  it("notifies writes, cross-tab state/legacy changes and clear, then removes listeners", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLearning(listener);
    recordPractice(conceptId, "independent");
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent("storage", { key: "other", storageArea: window.localStorage }));
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.sessionStorage }));
    expect(listener).toHaveBeenCalledTimes(1);
    for (const changedKey of [key, legacyKey, null]) window.dispatchEvent(new StorageEvent("storage", { key: changedKey, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    recordPractice(conceptId, "hinted");
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("does not notify on failed writes or erase earlier evidence", () => {
    const previous = recordPractice(conceptId, "independent");
    const listener = vi.fn();
    const unsubscribe = subscribeLearning(listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    try {
      expect(() => recordPractice(conceptId, "missed")).toThrow("Full");
      expect(listener).not.toHaveBeenCalled();
      expect(loadLearningState()).toEqual(previous);
    } finally { unsubscribe(); }
  });
});
