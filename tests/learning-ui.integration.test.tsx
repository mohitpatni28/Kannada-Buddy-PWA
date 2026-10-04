import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LearningHome } from "@/components/LearningHome";
import SettingsPage from "@/app/settings/page";
import { learningConcepts } from "@/data/learning-concepts";
import { orthographyUnits } from "@/data/orthography-units";
import { defaultSpeakingPreferences, savePreferences } from "@/lib/preferences";
import { selectSessionConcepts } from "@/lib/learningStore";
import { useCurrentTime } from "@/lib/useCurrentTime";
import { useHydrated } from "@/lib/useHydrated";
import { now } from "./fixtures";

const prefsKey = "kannada-buddy-learning-preferences-v2";
beforeEach(() => { window.localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date(now)); });
afterEach(() => vi.useRealTimers());

describe("adaptive session queue regression", () => {
  it("keeps a missed concept queued for a corrective retry after scheduled concepts", () => {
    savePreferences({ ...defaultSpeakingPreferences, referenceDeck: "core_only" });
    const expected = selectSessionConcepts(learningConcepts, { concepts: {}, orthography: {}, evidence: [] }, 5);
    render(<LearningHome />);
    expected.forEach((concept, index) => {
      expect(screen.getByRole("heading", { name: concept.intent })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Reveal and compare" }));
      fireEvent.click(screen.getByRole("button", { name: index === 0 ? "Not yet" : "Said it" }));
    });
    expect(screen.getByRole("heading", { name: expected[0].intent })).toBeTruthy();
    expect(screen.getByText("Corrective retry")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reveal and compare" }));
    fireEvent.click(screen.getByRole("button", { name: "Said it" }));
    expect(screen.getByText("Session complete")).toBeTruthy();
    const stored = JSON.parse(window.localStorage.getItem("kannada-buddy-learning-state-v2") ?? "{}");
    expect(stored.concepts[expected[0].id]).toMatchObject({ attempts: 2, lapses: 1, successes: 1 });
    expect(stored.evidence.at(-1)).toMatchObject({ conceptId: expected[0].id, corrective: true, outcome: "independent" });
  });

  it("completes script recognition and distinguishes helped reading from independent reading", () => {
    savePreferences({ ...defaultSpeakingPreferences, learningMode: "speaking_and_reading", romanization: "when_needed", referenceDeck: "core_only" });
    const unit = [...orthographyUnits].sort((a, b) => a.order - b.order)[0];
    const expected = selectSessionConcepts(learningConcepts, { concepts: {}, orthography: {}, evidence: [] }, 5);
    render(<LearningHome />);
    fireEvent.click(screen.getByRole("button", { name: "Try one recognition check" }));
    fireEvent.click(screen.getByRole("button", { name: unit.recognition[0].answer }));
    expect(screen.getByRole("heading", { name: expected[0].intent })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reveal and compare" }));
    fireEvent.click(screen.getByRole("button", { name: "Said it" }));
    expect(screen.getByRole("heading", { name: "Read this aloud" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show reading help" }));
    fireEvent.click(screen.getByRole("button", { name: "Read with help" }));
    expect(screen.getByRole("heading", { name: expected[1].intent })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reveal and compare" }));
    fireEvent.click(screen.getByRole("button", { name: "Said it" }));
    fireEvent.click(screen.getByRole("button", { name: "Read it" }));
    const stored = JSON.parse(window.localStorage.getItem("kannada-buddy-learning-state-v2") ?? "{}");
    expect(stored.orthography[unit.id]).toMatchObject({ attempts: 1, successes: 1 });
    expect(stored.concepts[expected[0].id]).toMatchObject({ readingAttempts: 1, readingSuccesses: 0 });
    expect(stored.concepts[expected[1].id]).toMatchObject({ readingAttempts: 1, readingSuccesses: 1 });
    expect(stored.evidence.filter((item: { activity: string }) => item.activity === "script_reading").map((item: { outcome: string }) => item.outcome)).toEqual(["hinted", "read"]);
  });

  it("preserves the initial queue while completed concepts leave the unseen set", () => {
    savePreferences({ ...defaultSpeakingPreferences, referenceDeck: "core_only" });
    const expected = selectSessionConcepts(learningConcepts, { concepts: {}, orthography: {}, evidence: [] }, 5);
    render(<LearningHome />);
    for (const [index, concept] of expected.entries()) {
      expect(screen.getByRole("heading", { name: concept.intent })).toBeTruthy();
      expect(screen.getByText(`${index + 1} of ${expected.length}`)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Reveal and compare" }));
      fireEvent.click(screen.getByRole("button", { name: /^Said it$/ }));
    }
    expect(screen.getByText("Session complete")).toBeTruthy();
    const stored = JSON.parse(window.localStorage.getItem("kannada-buddy-learning-state-v2") ?? "{}");
    expect(Object.keys(stored.concepts)).toEqual(expected.map((concept) => concept.id));
    expect(stored.evidence).toHaveLength(expected.length);
  });

  it("restarts a session when preferences change through another tab", () => {
    savePreferences({ ...defaultSpeakingPreferences, referenceDeck: "core_only" });
    render(<LearningHome />);
    expect(screen.getByRole("heading", { name: "Practise for real life" })).toBeTruthy();
    act(() => {
      const newValue = JSON.stringify({ ...defaultSpeakingPreferences, learningMode: "speaking_and_reading", referenceDeck: "core_only" });
      window.localStorage.setItem(prefsKey, newValue);
      window.dispatchEvent(new StorageEvent("storage", { key: prefsKey, storageArea: window.localStorage, newValue }));
    });
    expect(screen.getByRole("heading", { name: "Decode Kannada step by step" })).toBeTruthy();
  });
});

describe("settings and hydration stores", () => {
  it("loads saved preferences and updates same-tab and cross-tab selections while preserving progress", () => {
    const legacy = "unchanged-progress-fixture";
    window.localStorage.setItem("kannada-buddy-progress", legacy);
    savePreferences({ ...defaultSpeakingPreferences, sessionMinutes: 10 });
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: "10 min" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Speak + read" }));
    expect(screen.getByRole("button", { name: "Speak + read" }).getAttribute("aria-pressed")).toBe("true");
    expect(JSON.parse(window.localStorage.getItem(prefsKey) ?? "{}").sessionMinutes).toBe(10);
    act(() => {
      window.localStorage.setItem(prefsKey, JSON.stringify({ ...defaultSpeakingPreferences, sessionMinutes: 15 }));
      window.dispatchEvent(new StorageEvent("storage", { key: prefsKey, storageArea: window.localStorage }));
    });
    expect(screen.getByRole("button", { name: "15 min" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Speak Kannada" }).getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem("kannada-buddy-progress")).toBe(legacy);
  });

  it("marks mounted UI hydrated and updates the clock every minute with cleanup", () => {
    const hydration = renderHook(() => useHydrated());
    expect(hydration.result.current).toBe(true);
    hydration.unmount();
    const timersBefore = vi.getTimerCount();
    const clock = renderHook(() => useCurrentTime());
    expect(clock.result.current).toBe(new Date(now).getTime());
    act(() => vi.advanceTimersByTime(60_000));
    expect(clock.result.current).toBe(new Date(now).getTime() + 60_000);
    clock.unmount();
    expect(vi.getTimerCount()).toBe(timersBefore);
  });
});
