import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProgressSnapshot, loadProgress, parseProgressSnapshot, ratePhrase, saveProgress, subscribeProgress } from "@/lib/progress";
import { now, reviewed } from "./fixtures";

const key = "kannada-buddy-progress";
beforeEach(() => { window.localStorage.clear(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now)); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("progress storage", () => {
  it.each([null, "{broken", "null", "[]", "17", '"text"'])("safely treats %s as empty progress", (raw) => {
    if (raw !== null) window.localStorage.setItem(key, raw);
    expect(parseProgressSnapshot(raw)).toEqual({});
    expect(loadProgress()).toEqual({});
  });

  it("preserves existing storage format and history when rating", () => {
    const previous = reviewed("hello");
    saveProgress({ hello: previous, other: reviewed("other") });
    expect(getProgressSnapshot()).toBe(JSON.stringify({ hello: previous, other: reviewed("other") }));
    expect(ratePhrase("hello", 1)).toEqual({ ...previous, confidence: 1, nextReviewAt: "2026-10-05T06:00:00.000Z", correctCount: 1, wrongCount: 1 });
    expect(loadProgress().other).toEqual(reviewed("other"));
  });

  it("returns an empty snapshot when storage is denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    expect(getProgressSnapshot()).toBeNull();
    expect(loadProgress()).toEqual({});
  });

  it("has a stable empty server snapshot without browser globals", () => {
    vi.stubGlobal("window", undefined);
    expect(getProgressSnapshot()).toBeNull();
    expect(loadProgress()).toEqual({});
    expect(getProgressSnapshot()).toBe(getProgressSnapshot());
    const listener = vi.fn();
    expect(() => subscribeProgress(listener)()).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores storage events when the browser denies access to localStorage", () => {
    const listener = vi.fn();
    const storage = window.localStorage;
    const unsubscribe = subscribeProgress(listener);
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    try {
      expect(getProgressSnapshot()).toBeNull();
      window.dispatchEvent(new StorageEvent("storage", { key, storageArea: storage }));
      expect(listener).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });

  it("notifies on saves, relevant cross-tab changes and clear, then unsubscribes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProgress(listener);
    saveProgress({ hello: reviewed("hello") });
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated", storageArea: window.localStorage }));
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.sessionStorage }));
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
    window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    saveProgress({});
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("does not signal success or overwrite saved data when a write fails", () => {
    saveProgress({ hello: reviewed("hello") });
    const listener = vi.fn();
    const unsubscribe = subscribeProgress(listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    try {
      expect(() => saveProgress({})).toThrow("Full");
      expect(listener).not.toHaveBeenCalled();
      expect(loadProgress().hello).toEqual(reviewed("hello"));
    } finally { unsubscribe(); }
  });
});
