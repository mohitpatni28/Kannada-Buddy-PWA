import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/BottomNav";
import { Onboarding } from "@/components/Onboarding";
import PracticePage from "@/app/travel/page";
import PhrasebookPage from "@/app/phrasebook/page";
import LibraryPage from "@/app/library/page";
import SettingsPage from "@/app/settings/page";
import { viewport } from "@/app/layout";
import { courseLearningConcepts, courseScenarios } from "@/data/course-catalog";
import { adminLibraryPhrases } from "@/data/library-reference";
import { setPhraseStatus } from "@/lib/libraryStore";

const location = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }));

beforeEach(() => { localStorage.clear(); window.history.replaceState(null, "", "/"); location.pathname = "/"; });
afterEach(() => vi.restoreAllMocks());

describe("navigation and accessible app layout", () => {
  it("keeps all primary labels, renders real decorative icons, and identifies the active destination", () => {
    const { rerender } = render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getAllByRole("link").map((item) => item.textContent)).toEqual(["Today", "Practice", "Search", "Progress", "Settings"]);
    expect(nav.querySelectorAll("svg")).toHaveLength(5);
    expect(within(nav).getByRole("link", { name: "Today" }).getAttribute("aria-current")).toBe("page");
    location.pathname = "/library"; rerender(<BottomNav />);
    expect(within(nav).getByRole("link", { name: "Search" }).getAttribute("aria-current")).toBe("page");
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    location.pathname = "/review-other"; rerender(<BottomNav />);
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });

  it("allows zoom and uses the full device viewport", () => {
    expect(viewport).not.toHaveProperty("maximumScale");
    expect(viewport.viewportFit).toBe("cover");
  });

  it("makes Practice a distinct hub with scenario links without changing stored progress", () => {
    localStorage.setItem("kannada-buddy-learning-state-v2", "stored-progress");
    render(<PracticePage />);
    expect(screen.getByRole("heading", { name: "Prepare for your day" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start today’s lesson" }).getAttribute("href")).toBe("/today");
    for (const scenario of courseScenarios) expect(screen.getByRole("link", { name: new RegExp(scenario.title) }).getAttribute("href")).toBe(`/phrasebook?situation=${scenario.id}`);
    expect(screen.getByRole("link", { name: "Explore the reference library" }).getAttribute("href")).toBe("/library");
    expect(localStorage.getItem("kannada-buddy-learning-state-v2")).toBe("stored-progress");
  });
});

describe("course discovery and local reference eligibility", () => {
  it("opens the linked situation, permits changing it, and rejects unknown situation parameters", () => {
    const situation = courseScenarios[2];
    window.history.replaceState(null, "", `/phrasebook?situation=${situation.id}`);
    render(<PhrasebookPage />);
    expect(screen.getByRole("button", { name: situation.title }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe(`${courseLearningConcepts.filter((item) => item.missionId === situation.id).length} course phrases`);
    expect(screen.getByRole("link", { name: /broader reference library/ }).getAttribute("href")).toBe("/library");
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("status").textContent).toBe(`${courseLearningConcepts.length} course phrases`);
  });

  it("falls back to all for an unknown linked situation", () => {
    window.history.replaceState(null, "", "/phrasebook?situation=unknown");
    render(<PhrasebookPage />);
    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows a locally approved held phrase and removes rejected references without reload", () => {
    const held = adminLibraryPhrases.find((phrase) => phrase.status === "human_review_required")!;
    const draft = adminLibraryPhrases.find((phrase) => phrase.status === "ai_draft")!;
    render(<LibraryPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: held.english } });
    const results = () => screen.getAllByText(held.english, { exact: true }).filter((item) => item.classList.contains("english"));
    act(() => setPhraseStatus(held.id, "approved"));
    expect(results().length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: draft.english } });
    const beforeRejection = screen.getAllByText(draft.english, { exact: true }).filter((item) => item.classList.contains("english")).length;
    act(() => setPhraseStatus(draft.id, "rejected"));
    const afterRejection = screen.queryAllByText(draft.english, { exact: true }).filter((item) => item.classList.contains("english")).length;
    expect(afterRejection).toBe(beforeRejection - 1);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nonexistent-phrase-xyz" } });
    expect(screen.getByText("No phrases match this filter.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "");
    expect(screen.getByRole("combobox", { name: "Source category" })).toHaveProperty("value", "all");
  });
});

describe("honest settings and onboarding storage feedback", () => {
  it("reports a failed save and permits a successful retry", () => {
    render(<SettingsPage />);
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new DOMException("Quota exceeded", "QuotaExceededError"); });
    fireEvent.click(screen.getByRole("button", { name: "10 min" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Could not save settings/);
    expect(screen.queryByText("Settings saved on this device.")).toBeNull();
    write.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "10 min" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Settings saved on this device.");
    expect(JSON.parse(localStorage.getItem("kannada-buddy-learning-preferences-v2")!)).toHaveProperty("sessionMinutes", 10);
  });

  it("keeps onboarding available after failure and allows a retry", () => {
    const choose = vi.fn().mockImplementationOnce(() => { throw new Error("Storage unavailable"); });
    render(<Onboarding onChoose={choose} />);
    fireEvent.click(screen.getByRole("button", { name: /Choose speaking →/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/Could not save your choice/);
    fireEvent.click(screen.getByRole("button", { name: /Choose speaking →/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(choose).toHaveBeenCalledTimes(2);
  });
});
