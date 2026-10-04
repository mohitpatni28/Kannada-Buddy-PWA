import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReviewPage from "@/app/review/page";
import AdminPage from "@/app/admin/page";
import { now, phrases } from "./fixtures";
import { learningConcepts } from "@/data/learning-concepts";
import { orthographyUnits } from "@/data/orthography-units";
import { recordPractice, recordOrthography } from "@/lib/learningStore";
import type { ConceptProgress, LearningState } from "@/lib/types";

vi.mock("@/data/library-reference", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/data/library-reference")>(),
  adminLibraryPhrases: (await import("./fixtures")).adminPhrases,
  libraryDraftCounts: { priority: 1, held: 1, caution: 0 }
}));

const progressKey = "kannada-buddy-learning-state-v2";
const overridesKey = "kannada-buddy-library-overrides";

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(now));
});
afterEach(() => vi.useRealTimers());

const concept = learningConcepts[0];
const unit = orthographyUnits[0];
function conceptProgress(nextReviewAt = "2026-10-11T06:00:00.000Z"): ConceptProgress {
  return { conceptId: concept.id, attempts: 2, successes: 2, lapses: 0, stabilityDays: 7,
    lastSeenAt: now, nextReviewAt, readingAttempts: 1, readingSuccesses: 1 };
}
function assertStat(label: string, expected: number, scope: Pick<typeof screen, "getByRole"> = screen) {
  const card = within(scope.getByRole("region", { name: "Active deck progress" })).getByText(label).closest("article");
  expect(card?.querySelector("strong")?.textContent).toBe(String(expected));
}

describe("adaptive progress UI and persisted learning state", () => {
  it("hydrates server HTML and loads persisted concept/script history without a mismatch", async () => {
    const state: LearningState = { concepts: { [concept.id]: conceptProgress() }, orthography: {
      [unit.id]: { unitId: unit.id, attempts: 3, successes: 2, stabilityDays: 3, lastSeenAt: now, nextReviewAt: now }
    }, evidence: [] };
    window.localStorage.setItem(progressKey, JSON.stringify(state));
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ReviewPage />);
    document.body.append(container);
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => { root = hydrateRoot(container, <ReviewPage />, { onRecoverableError: (error) => errors.push(error) }); });
      expect(errors).toEqual([]);
      expect(within(container).getByRole("heading", { name: concept.intent })).toBeTruthy();
      expect(within(container).getByRole("heading", { name: unit.title })).toBeTruthy();
      assertStat("learning", 1, within(container));
      assertStat("retained speaking", 0, within(container));
      assertStat("due now", 0, within(container));
      expect(within(container).getByText(/Lifetime: 2 speaking attempts · 1 reading attempts · 3 script checks/)).toBeTruthy();
      expect(JSON.parse(window.localStorage.getItem(progressKey) ?? "{}")).toEqual(state);
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  });

  it("updates visible progress after same-tab practice and script attempts", () => {
    render(<ReviewPage />);
    assertStat("learning", 0);
    expect(screen.getByText(/Complete your first lesson/)).toBeTruthy();
    act(() => { recordPractice(concept.id, "independent"); recordOrthography(unit.id, "independent"); });
    assertStat("learning", 1);
    expect(screen.getByText(/Lifetime: 1 speaking attempts · 0 reading attempts · 1 script checks/)).toBeTruthy();
    assertStat("due now", 0);
    expect(screen.getByRole("heading", { name: concept.intent })).toBeTruthy();
    expect(screen.getByRole("heading", { name: unit.title })).toBeTruthy();
    const stored = JSON.parse(window.localStorage.getItem(progressKey) ?? "{}");
    expect(stored.concepts[concept.id].attempts).toBe(1);
    expect(stored.orthography[unit.id].attempts).toBe(1);
    expect(stored.evidence).toHaveLength(2);
  });

  it("reacts to cross-tab changes and storage clear", () => {
    render(<ReviewPage />);
    act(() => {
      const newValue = JSON.stringify({ concepts: { [concept.id]: conceptProgress(now) }, orthography: {}, evidence: [] });
      window.localStorage.setItem(progressKey, newValue);
      window.dispatchEvent(new StorageEvent("storage", { key: progressKey, newValue, storageArea: window.localStorage }));
    });
    assertStat("learning", 0);
    assertStat("due now", 1);
    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: window.localStorage }));
    });
    assertStat("learning", 0);
    expect(screen.queryByRole("heading", { name: concept.intent })).toBeNull();
  });

  it("counts a concept due at the exact boundary and keeps future reviews excluded", () => {
    window.localStorage.setItem(progressKey, JSON.stringify({ concepts: { [concept.id]: conceptProgress(now) }, orthography: {}, evidence: [] }));
    render(<ReviewPage />);
    assertStat("due now", 1);
    act(() => recordPractice(concept.id, "independent"));
    assertStat("due now", 0);
    assertStat("retained speaking", 0);
  });
});

describe("admin status refresh regression", () => {
  it("refreshes saved text and status after a cross-tab update and clear", () => {
    render(<AdminPage />);
    act(() => {
      const newValue = JSON.stringify({ raw: { id: "raw", status: "approved", english: "Cross-tab candidate" } });
      window.localStorage.setItem(overridesKey, newValue);
      window.dispatchEvent(new StorageEvent("storage", { key: overridesKey, newValue, storageArea: window.localStorage }));
    });
    expect(screen.queryByText("Raw fixture", { selector: ".english" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^approved \(/ }));
    expect(screen.getByText("Cross-tab candidate", { selector: ".english" })).toBeTruthy();
    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: window.localStorage }));
    });
    expect(screen.queryByText("Cross-tab candidate", { selector: ".english" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^priority queue \(/ }));
    expect(screen.getByText("Raw fixture", { selector: ".english" })).toBeTruthy();
  });

  it("hydrates saved text and status overrides without a hydration mismatch", async () => {
    window.localStorage.setItem(overridesKey, JSON.stringify({
      raw: { id: "raw", status: "approved", english: "Previously edited candidate" }
    }));
    const browserWindow = window;
    let html: string;
    vi.stubGlobal("window", undefined);
    try { html = renderToString(<AdminPage />); }
    finally { vi.stubGlobal("window", browserWindow); }
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => { root = hydrateRoot(container, <AdminPage />, { onRecoverableError: (error) => errors.push(error) }); });
      expect(errors).toEqual([]);
      expect(within(container).queryByText("Raw fixture", { selector: ".english" })).toBeNull();
      fireEvent.click(within(container).getByRole("button", { name: /^approved \(/ }));
      expect(within(container).getByText("Previously edited candidate", { selector: ".english" })).toBeTruthy();
      const candidateCard = within(container).getByText("Previously edited candidate", { selector: ".english" }).closest("article")!;
      fireEvent.click(within(candidateCard).getByRole("button", { name: "Edit" }));
      expect(within(candidateCard).getByRole("textbox", { name: "English meaning" })).toHaveProperty("value", "Previously edited candidate");
      expect(within(candidateCard).getByRole("textbox", { name: "Romanized Kannada" })).toHaveProperty("value", "Candidate");
      expect(within(candidateCard).getByRole("textbox", { name: "Kannada script" })).toBeTruthy();
      expect(within(candidateCard).getByRole("textbox", { name: "Category" })).toHaveProperty("value", "greetings");
      expect(within(candidateCard).getByRole("textbox", { name: "Usage note" })).toBeTruthy();
      fireEvent.click(within(candidateCard).getByRole("button", { name: "Cancel" }));
      expect(JSON.parse(window.localStorage.getItem(overridesKey) ?? "{}").raw.status).toBe("approved");
    } finally {
      await act(async () => root?.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });

  it("refreshes filters after approval and rejection while preserving existing overrides", () => {
    const existing = { hello: { id: "hello", usageNote: "Keep this note" }, raw: { id: "raw", english: "Edited candidate", tags: ["saved-tag"] } };
    window.localStorage.setItem(overridesKey, JSON.stringify(existing));
    render(<AdminPage />);
    expect(screen.getByText("Edited candidate", { selector: ".english" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Approve locally for Library" }));
    expect(screen.getByText("Edited candidate", { selector: ".english" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^approved \(/ }));
    expect(screen.getByText("Edited candidate", { selector: ".english" })).toBeTruthy();
    const candidateCard = screen.getByText("Edited candidate", { selector: ".english" }).closest("article");
    expect(candidateCard).not.toBeNull();
    fireEvent.click(within(candidateCard!).getByRole("button", { name: "Edit" }));
    const englishField = within(candidateCard!).getByRole("textbox", { name: "English meaning" });
    expect(englishField).toHaveProperty("value", "Edited candidate");
    fireEvent.change(englishField, { target: { value: "Saved candidate edit" } });
    fireEvent.click(within(candidateCard!).getByRole("button", { name: "Save" }));
    expect(screen.getByText("Saved candidate edit", { selector: ".english" })).toBeTruthy();
    fireEvent.click(within(candidateCard!).getByRole("button", { name: "Edit" }));
    expect(within(candidateCard!).getByRole("textbox", { name: "English meaning" })).toHaveProperty("value", "Saved candidate edit");
    fireEvent.click(within(candidateCard!).getByRole("button", { name: "Cancel" }));
    fireEvent.click(within(candidateCard!).getByRole("button", { name: "Reject" }));
    expect(screen.queryByText("Saved candidate edit", { selector: ".english" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^all \(/ }));
    expect(screen.getByText("Saved candidate edit", { selector: ".english" })).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem(overridesKey) ?? "{}");
    expect(saved.hello).toEqual(existing.hello);
    expect(saved.raw).toMatchObject({ ...existing.raw, english: "Saved candidate edit", status: "rejected", updatedAt: now });
    expect(phrases[2].status).toBe("raw_imported");
  });
});
