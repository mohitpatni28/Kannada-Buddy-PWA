import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLibrarySnapshot, loadPhraseOverrides, mergeOverrides, parseLibrarySnapshot, setPhraseStatus, subscribeLibrary, updatePhraseOverride } from "@/lib/libraryStore";
import { now, phrases } from "./fixtures";

const key = "kannada-buddy-library-overrides";
beforeEach(() => { window.localStorage.clear(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now)); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("library override external store", () => {
  it.each([null, "{broken", "null", "[]", "17", '"text"'])("treats corrupt or unsupported %s as empty overrides", (raw) => {
    if (raw !== null) window.localStorage.setItem(key, raw);
    expect(parseLibrarySnapshot(raw)).toEqual({});
    expect(loadPhraseOverrides()).toEqual({});
    expect(mergeOverrides(phrases)).toEqual(phrases);
  });

  it("preserves unrelated overrides and original phrases when updating text and status", () => {
    const unrelated = { id: "hello", usageNote: "Saved note" };
    window.localStorage.setItem(key, JSON.stringify({ hello: unrelated }));
    updatePhraseOverride("raw", { english: "Edited candidate", tags: ["saved"] });
    setPhraseStatus("raw", "approved");
    const saved = loadPhraseOverrides();
    expect(saved.hello).toEqual(unrelated);
    expect(saved.raw).toEqual({ id: "raw", english: "Edited candidate", tags: ["saved"], status: "approved", updatedAt: now });
    expect(getLibrarySnapshot()).toBe(JSON.stringify(saved));
    expect(mergeOverrides(phrases)[2]).toEqual({ ...phrases[2], ...saved.raw });
    expect(phrases[2].status).toBe("raw_imported");
  });

  it("returns empty data and a harmless subscription on the server", () => {
    vi.stubGlobal("window", undefined);
    expect(getLibrarySnapshot()).toBeNull();
    expect(loadPhraseOverrides()).toEqual({});
    const listener = vi.fn();
    expect(() => subscribeLibrary(listener)()).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it("handles denied reads and denied access during a storage event", () => {
    const listener = vi.fn();
    const storage = window.localStorage;
    const unsubscribe = subscribeLibrary(listener);
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    try {
      expect(getLibrarySnapshot()).toBeNull();
      expect(loadPhraseOverrides()).toEqual({});
      window.dispatchEvent(new StorageEvent("storage", { key, storageArea: storage }));
      expect(listener).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });

  it("handles a failure from the storage read method", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    expect(getLibrarySnapshot()).toBeNull();
  });

  it("notifies same-tab updates and relevant cross-tab changes then removes listeners", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLibrary(listener);
    updatePhraseOverride("raw", { status: "approved" });
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated", storageArea: window.localStorage }));
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.sessionStorage }));
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
    window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    updatePhraseOverride("raw", { status: "rejected" });
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("does not notify or mutate stored overrides after a failed write", () => {
    updatePhraseOverride("raw", { english: "Existing edit" });
    const listener = vi.fn();
    const unsubscribe = subscribeLibrary(listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    try {
      expect(() => setPhraseStatus("raw", "approved")).toThrow("Full");
      expect(listener).not.toHaveBeenCalled();
      expect(loadPhraseOverrides().raw.english).toBe("Existing edit");
      expect(loadPhraseOverrides().raw.status).toBeUndefined();
    } finally { unsubscribe(); }
  });
});
