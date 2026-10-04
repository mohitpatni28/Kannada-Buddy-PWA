import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultReadingPreferences, defaultSpeakingPreferences, getPreferencesSnapshot, parsePreferencesSnapshot, savePreferences, subscribePreferences } from "@/lib/preferences";

const key = "kannada-buddy-learning-preferences-v2";
beforeEach(() => window.localStorage.clear());
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("preference external store", () => {
  it.each([null, "{broken", "null", "[]", "17", '"text"'])("rejects unsupported %s snapshots", (raw) => {
    expect(parsePreferencesSnapshot(raw)).toBeNull();
  });
  it("preserves earlier choices and fills new preference defaults", () => {
    expect(parsePreferencesSnapshot('{"romanization":"hidden","sessionMinutes":15}')).toEqual({ ...defaultSpeakingPreferences, romanization: "hidden", sessionMinutes: 15 });
    savePreferences(defaultReadingPreferences);
    expect(parsePreferencesSnapshot(getPreferencesSnapshot())).toEqual(defaultReadingPreferences);
  });
  it("has safe SSR and denied storage reads", () => {
    vi.stubGlobal("window", undefined);
    expect(getPreferencesSnapshot()).toBeNull();
    expect(() => subscribePreferences(vi.fn())()).not.toThrow();
    vi.unstubAllGlobals();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied"); });
    expect(getPreferencesSnapshot()).toBeNull();
  });
  it("handles denied getter access during subscription events", () => {
    const listener = vi.fn();
    const storage = window.localStorage;
    const unsubscribe = subscribePreferences(listener);
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("Denied"); });
    try {
      window.dispatchEvent(new StorageEvent("storage", { key, storageArea: storage }));
      expect(listener).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });
  it("notifies changes and clear, filters unrelated events, and cleans up", () => {
    const listener = vi.fn();
    const unsubscribe = subscribePreferences(listener);
    savePreferences(defaultReadingPreferences);
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent("storage", { key: "other", storageArea: window.localStorage }));
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.sessionStorage }));
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
    window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    savePreferences(defaultSpeakingPreferences);
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(3);
  });
  it("does not notify or lose saved choices after a failed write", () => {
    savePreferences(defaultReadingPreferences);
    const listener = vi.fn();
    const unsubscribe = subscribePreferences(listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full"); });
    try {
      expect(() => savePreferences(defaultSpeakingPreferences)).toThrow("Full");
      expect(listener).not.toHaveBeenCalled();
      expect(parsePreferencesSnapshot(getPreferencesSnapshot())).toEqual(defaultReadingPreferences);
    } finally { unsubscribe(); }
  });
});
