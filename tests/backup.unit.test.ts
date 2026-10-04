import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBackup, MAX_BACKUP_BYTES, parseBackup, restoreBackup } from "@/lib/backup";
import { recordPractice, recordOrthography } from "@/lib/learningStore";
import { savePreferences, defaultSpeakingPreferences } from "@/lib/preferences";

const learningKey = "kannada-buddy-learning-state-v2";
const preferencesKey = "kannada-buddy-learning-preferences-v2";
const legacyKey = "kannada-buddy-progress";
const now = "2026-10-04T06:00:00.000Z";
const empty = () => ({ format: "kannada-buddy-backup", version: 1, exportedAt: now,
  data: { learning: { concepts: {}, orthography: {}, evidence: [] }, preferences: null, legacyProgress: null } });
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe("validated local backups", () => {
  it("round trips real speaking, reading, script progress and settings without exporting other storage", () => {
    recordPractice("greet-hello", "independent", "read"); recordOrthography("vowels", "independent"); savePreferences(defaultSpeakingPreferences);
    localStorage.setItem("ADMIN_PASSWORD", "never-export-this");
    localStorage.setItem("kannada-buddy-library-overrides", '{"example":{"status":"approved"}}');
    const backup = createBackup(localStorage, new Date(now));
    expect(JSON.stringify(backup)).not.toContain("never-export-this");
    expect(JSON.stringify(backup)).not.toContain("approved");
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
    expect(backup.data.learning?.concepts).toHaveProperty("greet-hello.readingNextReviewAt");
    expect(() => parseBackup(JSON.stringify(backup).replace(/("readingNextReviewAt":")[^"]+/, '$1invalid'))).toThrow();
    const original = localStorage.getItem(learningKey);
    localStorage.removeItem(learningKey);
    const notify = vi.fn(); restoreBackup(backup, localStorage, notify);
    expect(localStorage.getItem(learningKey)).toBe(original);
    expect(localStorage.getItem("ADMIN_PASSWORD")).toBe("never-export-this");
    expect(notify.mock.calls.flat()).toEqual(["kannada-buddy-learning-state-change", "kannada-buddy-preferences-change", "kannada-buddy-progress-change"]);
  });
  it("preserves legacy-only data and missing preferences for migration without inventing progress", () => {
    const legacy = { "greet-hello": { phraseId: "greet-hello", confidence: 3, correctCount: 1, wrongCount: 0, lastSeenAt: now, nextReviewAt: now } };
    localStorage.setItem(legacyKey, JSON.stringify(legacy));
    const backup = createBackup(localStorage, new Date(now));
    expect(backup.data.learning).toBeNull(); expect(backup.data.preferences).toBeNull();
    localStorage.setItem(learningKey, JSON.stringify(empty().data.learning));
    restoreBackup(backup, localStorage, () => {});
    expect(localStorage.getItem(learningKey)).toBeNull(); expect(JSON.parse(localStorage.getItem(legacyKey)!)).toEqual(legacy);
  });
  it.each(["not json", "null", "[]", JSON.stringify({ ...empty(), version: 2 }), JSON.stringify({ ...empty(), exportedAt: "2026-02-30T00:00:00Z" }), JSON.stringify({ ...empty(), data: {} }), '{"format":"kannada-buddy-backup","version":1,"__proto__":{}}'])("rejects malformed or unsupported backup %s", (text) => { expect(() => parseBackup(text)).toThrow(); });
  it("rejects oversized input", () => { expect(() => parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1))).toThrow("too large"); });
  it("rejects invalid preferences and malformed counters before writing", () => {
    const backup = empty();
    const invalid = { ...backup, data: { ...backup.data, preferences: { ...defaultSpeakingPreferences, sessionMinutes: 8 } } };
    const set = vi.spyOn(Storage.prototype, "setItem");
    expect(() => restoreBackup(invalid, localStorage, () => {})).toThrow(); expect(set).not.toHaveBeenCalled();
    recordPractice("greet-hello", "independent");
    const real = createBackup(localStorage);
    const text = JSON.stringify(real).replace('"attempts":1', '"attempts":-1');
    expect(() => parseBackup(text)).toThrow();
    expect(() => parseBackup(JSON.stringify(real).replace('"successes":1', '"successes":2'))).toThrow();
    expect(() => parseBackup(JSON.stringify(real).replace('"independent"', '"invented"'))).toThrow();
    expect(() => parseBackup(JSON.stringify(real).replace('"delayedSuccesses":0', '"delayedSuccesses":1e999'))).toThrow();
  });
  it("reports a failed rollback and never announces successful restoration", () => {
    localStorage.setItem(learningKey, "original learning");
    localStorage.setItem(preferencesKey, "original preferences");
    const originalSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === preferencesKey || value === "original learning") throw new DOMException("Storage unavailable", "QuotaExceededError");
      originalSet.call(this, key, value);
    });
    const backup = parseBackup(JSON.stringify({ ...empty(), data: { ...empty().data, preferences: defaultSpeakingPreferences } }));
    const notify = vi.fn();
    expect(() => restoreBackup(backup, localStorage, notify)).toThrow("could not be fully restored");
    expect(notify).not.toHaveBeenCalled();
  });
  it("rolls back all previous writes on storage failure and emits no success notification", () => {
    localStorage.setItem(learningKey, "original learning"); localStorage.setItem(preferencesKey, "original preferences");
    const originalSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === preferencesKey && value !== "original preferences") throw new DOMException("Quota", "QuotaExceededError");
      originalSet.call(this, key, value);
    });
    const backup = parseBackup(JSON.stringify({ ...empty(), data: { ...empty().data, preferences: defaultSpeakingPreferences } }));
    const notify = vi.fn();
    expect(() => restoreBackup(backup, localStorage, notify)).toThrow("previous data was restored");
    expect(localStorage.getItem(learningKey)).toBe("original learning"); expect(localStorage.getItem(preferencesKey)).toBe("original preferences"); expect(notify).not.toHaveBeenCalled();
  });
});
