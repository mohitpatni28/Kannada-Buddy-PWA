/** Manual, local-only backups. No credentials or admin edits are exported. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const stores = {
  learning: ["kannada-buddy-learning-state-v2", "kannada-buddy-learning-state-change"],
  preferences: ["kannada-buddy-learning-preferences-v2", "kannada-buddy-preferences-change"],
  legacyProgress: ["kannada-buddy-progress", "kannada-buddy-progress-change"]
} as const;
type StoreName = keyof typeof stores;
export type LocalBackup = {
  format: "kannada-buddy-backup";
  version: 1;
  exportedAt: string;
  data: Record<StoreName, Record<string, unknown> | null>;
};
function fail(): never { throw new Error("Invalid backup. Choose an unmodified Kannada Buddy backup file."); }
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
}
function safeTree(value: unknown, depth = 0): void {
  if (depth > 12) fail();
  if (value && typeof value === "object") {
    if (Object.keys(value).length > 10000) fail();
    for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) fail();
      safeTree(child, depth + 1);
    }
  }
}
function calendarDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function date(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !calendarDay(value.slice(0, 10)) || !Number.isFinite(Date.parse(value))) fail();
}
function number(value: unknown, integer = true): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) fail();
}
function oneOf(value: unknown, options: readonly unknown[]): void { if (!options.includes(value)) fail(); }
function id(value: unknown, key?: string): void { if (typeof value !== "string" || !value.length || value.length > 300 || (key !== undefined && key !== value)) fail(); }
function recall(value: unknown, outcomes: string[], successes: unknown): void {
  record(value);
  if (!Array.isArray(value.days) || value.days.length > 2 || value.days.some((day) => typeof day !== "string" || !calendarDay(day))) fail();
  if (new Set(value.days).size !== value.days.length) fail();
  number(value.delayedSuccesses); number(value.lastGapDays, false);
  oneOf(value.lastOutcome, outcomes); date(value.lastOccurredAt);
  if (Number(value.delayedSuccesses) > Number(successes) || value.days.length > Number(value.delayedSuccesses)) fail();
}
function learning(value: unknown): void {
  record(value); record(value.concepts); record(value.orthography);
  for (const [key, item] of Object.entries(value.concepts)) {
    record(item); id(item.conceptId, key);
    for (const field of ["attempts", "successes", "lapses", "readingAttempts", "readingSuccesses"]) number(item[field]);
    number(item.stabilityDays, false); date(item.lastSeenAt); date(item.nextReviewAt);
    if (Number(item.successes) > Number(item.attempts) || Number(item.readingSuccesses) > Number(item.readingAttempts) || Number(item.lapses) > Number(item.attempts)) fail();
    if (item.speakingRecall !== undefined) recall(item.speakingRecall, ["independent", "hinted", "missed"], item.successes);
    if (item.readingNextReviewAt !== undefined) date(item.readingNextReviewAt);
    if (item.readingRecall !== undefined) recall(item.readingRecall, ["read", "hinted", "skipped"], item.readingSuccesses);
  }
  for (const [key, item] of Object.entries(value.orthography)) {
    record(item); id(item.unitId, key); number(item.attempts); number(item.successes); number(item.stabilityDays, false); date(item.lastSeenAt); date(item.nextReviewAt);
    if (Number(item.successes) > Number(item.attempts)) fail();
  }
  if (!Array.isArray(value.evidence) || value.evidence.length > 500) fail();
  for (const item of value.evidence) {
    record(item); id(item.conceptId); oneOf(item.activity, ["cued_production", "script_reading", "grapheme_recognition"]);
    oneOf(item.outcome, item.activity !== "script_reading" ? ["independent", "hinted", "missed"] : ["read", "hinted", "skipped"]);
    number(item.hintsUsed); date(item.occurredAt);
    for (const field of ["corrective", "migrated", "scheduled"]) if (item[field] !== undefined && typeof item[field] !== "boolean") fail();
    if (item.gapDays !== undefined) number(item.gapDays, false);
  }
}
function preferences(value: unknown): void {
  record(value); oneOf(value.learningMode, ["speaking", "speaking_and_reading"]); oneOf(value.romanization, ["always", "when_needed", "hidden"]); oneOf(value.sessionMinutes, [5, 10, 15]);
  // Early v2 preferences did not include a reference deck.
  if (value.referenceDeck !== undefined) oneOf(value.referenceDeck, ["core_only", "safe_ai_drafts", "all_eligible_ai_drafts", "ai_drafts_only"]);
}
function legacy(value: unknown): void {
  record(value);
  for (const [key, item] of Object.entries(value)) {
    record(item); id(item.phraseId, key); oneOf(item.confidence, [1, 2, 3]); date(item.lastSeenAt); date(item.nextReviewAt); number(item.correctCount); number(item.wrongCount);
  }
}
export function parseBackup(text: string): LocalBackup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error("Backup is too large (maximum 5 MB).");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return fail(); }
  safeTree(parsed); record(parsed);
  if (parsed.format !== "kannada-buddy-backup" || parsed.version !== 1) fail();
  date(parsed.exportedAt); record(parsed.data);
  const data: LocalBackup["data"] = { learning: null, preferences: null, legacyProgress: null };
  for (const name of Object.keys(stores) as StoreName[]) {
    const value = parsed.data[name];
    if (value !== null) {
      ({ learning, preferences, legacyProgress: legacy })[name](value);
      record(value); data[name] = value;
    }
  }
  return { format: "kannada-buddy-backup", version: 1, exportedAt: parsed.exportedAt, data };
}
export function createBackup(storage: Storage, now = new Date()): LocalBackup {
  const data = Object.fromEntries(Object.entries(stores).map(([name, [key]]) => {
    const raw = storage.getItem(key);
    return [name, raw === null ? null : JSON.parse(raw)];
  }));
  return parseBackup(JSON.stringify({ format: "kannada-buddy-backup", version: 1, exportedAt: now.toISOString(), data }));
}
export function restoreBackup(backup: unknown, storage: Storage, notify: (event: string) => void): void {
  const checked = parseBackup(JSON.stringify(backup));
  const entries = (Object.keys(stores) as StoreName[]).map((name) => ({ name, key: stores[name][0], previous: storage.getItem(stores[name][0]) }));
  const written: typeof entries = [];
  try {
    for (const entry of entries) {
      written.push(entry);
      const value = checked.data[entry.name];
      if (value === null) storage.removeItem(entry.key); else storage.setItem(entry.key, JSON.stringify(value));
    }
  } catch {
    let rollbackFailed = false;
    for (const entry of written.reverse()) {
      try { if (entry.previous === null) storage.removeItem(entry.key); else storage.setItem(entry.key, entry.previous); } catch { rollbackFailed = true; }
    }
    throw new Error(rollbackFailed ? "Restore failed and browser storage could not be fully restored. Keep your backup file and retry when storage is available." : "Restore failed. Your previous data was restored. Check browser storage permissions and free space.");
  }
  for (const [, event] of Object.values(stores)) notify(event);
}
