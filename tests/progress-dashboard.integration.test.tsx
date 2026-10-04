import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ProgressPage from "@/app/review/page";
import { activeLearningConcepts } from "@/lib/learningMetrics";
import { recordPractice } from "@/lib/learningStore";
import { savePreferences, defaultSpeakingPreferences } from "@/lib/preferences";
import { now } from "./fixtures";
beforeEach(() => { localStorage.clear(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now)); });
afterEach(() => vi.useRealTimers());
function dueCount() { return screen.getByText("due now").closest("article")?.querySelector("strong")?.textContent; }
it("reconciles due counts and visible concept history when deck settings change", () => {
  const core = activeLearningConcepts("core_only")[0];
  const ai = activeLearningConcepts("ai_drafts_only")[0];
  recordPractice(core.id, "missed"); recordPractice(ai.id, "missed");
  vi.setSystemTime(new Date(Date.now() + 86400000));
  savePreferences({ ...defaultSpeakingPreferences, referenceDeck: "core_only" });
  render(<ProgressPage />);
  expect(dueCount()).toBe("1");
  const history = screen.getByRole("heading", { name: "Concept history" }).closest("section")!;
  expect(within(history).queryByRole("heading", { name: ai.intent })).toBeNull();
  act(() => savePreferences({ ...defaultSpeakingPreferences, referenceDeck: "safe_ai_drafts" }));
  expect(dueCount()).toBe("2");
  expect(within(history).getByRole("heading", { name: ai.intent })).toBeTruthy();
});
it("shows independent reading and speaking totals without claiming pronunciation scoring", () => {
  const core = activeLearningConcepts("core_only")[0];
  savePreferences({ ...defaultSpeakingPreferences, referenceDeck: "core_only" });
  recordPractice(core.id, "independent", "hinted");
  render(<ProgressPage />);
  expect(screen.getByText(/Lifetime: 1 speaking attempts · 1 reading attempts/)).toBeTruthy();
  expect(screen.getByText(/Speaking is self-reported recall/)).toBeTruthy();
  expect(screen.getByText("retained speaking").closest("article")?.querySelector("strong")?.textContent).toBe("0");
});
