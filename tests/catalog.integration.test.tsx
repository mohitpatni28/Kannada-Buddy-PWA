import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "@/app/admin/page";
import LibraryPage from "@/app/library/page";
import PhrasebookPage from "@/app/phrasebook/page";
import { TravelPlayer } from "@/components/TravelPlayer";
import { learningConcepts, missionOrder } from "@/data/learning-concepts";
import { setPhraseStatus, updatePhraseOverride } from "@/lib/libraryStore";
import { phrases } from "./fixtures";

vi.mock("@/data/library-reference", async () => {
  const { adminPhrases } = await import("./fixtures");
  const batch = Array.from({ length: 125 }, (_, index) => ({ ...adminPhrases[2], id: `batch-${index}`, english: `Batch phrase ${String(index).padStart(3, "0")}`, status: "approved" }));
  return { adminLibraryPhrases: batch, libraryPhrases: batch, libraryDraftCounts: { safe: 0, caution: 0, priority: 125, held: 0 } };
});
beforeEach(() => window.localStorage.clear());
afterEach(() => vi.useRealTimers());

describe("catalog pagination and filter regressions", () => {
  it("resets admin pagination on query and queue changes", () => {
    render(<AdminPage />);
    expect(screen.getByRole("status").textContent).toBe("Showing 50 of 125 matching review items");
    fireEvent.click(screen.getByRole("button", { name: "Show 50 more" }));
    expect(screen.getByRole("status").textContent).toBe("Showing 100 of 125 matching review items");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search review queues" }), { target: { value: "Batch" } });
    expect(screen.getByRole("status").textContent).toBe("Showing 50 of 125 matching review items");
    fireEvent.click(screen.getByRole("button", { name: "Show 50 more" }));
    fireEvent.click(screen.getByRole("button", { name: /^approved \(/ }));
    expect(screen.getByRole("status").textContent).toBe("Showing 50 of 125 matching review items");
  });

  it("resets library pagination on query, category and status changes", () => {
    render(<LibraryPage />);
    expect(screen.getByRole("status").textContent?.trim()).toBe("Showing 60 of 125 matching references");
    fireEvent.click(screen.getByRole("button", { name: "Show 60 more" }));
    expect(screen.getByRole("status").textContent?.trim()).toBe("Showing 120 of 125 matching references");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Batch" } });
    expect(screen.getByRole("status").textContent?.trim()).toBe("Showing 60 of 125 matching references");
    fireEvent.click(screen.getByRole("button", { name: "Show 60 more" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), { target: { value: "greetings" } });
    expect(screen.getByRole("status").textContent?.trim()).toBe("Showing 60 of 125 matching references");
    fireEvent.click(screen.getByRole("button", { name: "Show 60 more" }));
    fireEvent.click(screen.getByRole("button", { name: /^approved \(/ }));
    expect(screen.getByRole("status").textContent?.trim()).toBe("Showing 60 of 125 matching references");
  });

  it("filters the course by mission and a case-insensitive script/meaning query", () => {
    render(<PhrasebookPage />);
    const concept = learningConcepts.find((item) => item.missionId === missionOrder[0])!;
    fireEvent.click(screen.getByRole("button", { name: concept.missionTitle }));
    const results = screen.getByRole("region", { name: "Phrase results" });
    expect(results.querySelectorAll("article")).toHaveLength(learningConcepts.filter((item) => item.missionId === concept.missionId).length);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: `  ${concept.form.kannadaScript}  ` } });
    expect(within(results).getByText(concept.intent)).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-such-fixture-phrase" } });
    expect(screen.getByText(/No matching course phrase/)).toBeTruthy();
  });
});

describe("travel override subscription regression", () => {
  it("keeps the counter and progress within bounds when the drill shrinks after advancing", () => {
    render(<TravelPlayer phrases={phrases} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Thanks fixture")).toBeTruthy();
    expect(screen.getByText("2 of 2")).toBeTruthy();
    act(() => setPhraseStatus("hello", "rejected"));
    expect(screen.getByText("Thanks fixture")).toBeTruthy();
    expect(screen.getByText("1 of 1")).toBeTruthy();
    expect(screen.getByLabelText("Drill progress").firstElementChild).toHaveProperty("style.width", "100%");
    act(() => setPhraseStatus("thanks", "rejected"));
    expect(screen.getByText(/No approved phrases/)).toBeTruthy();
    expect(screen.queryByLabelText("Drill progress")).toBeNull();
  });

  it("refreshes current text and removes locally rejected phrases without reload", () => {
    render(<TravelPlayer phrases={phrases} />);
    expect(screen.getByText("Hello fixture")).toBeTruthy();
    act(() => updatePhraseOverride("hello", { english: "Updated greeting" }));
    expect(screen.getByText("Updated greeting")).toBeTruthy();
    act(() => setPhraseStatus("hello", "rejected"));
    expect(screen.queryByText("Updated greeting")).toBeNull();
    expect(screen.getByText("Thanks fixture")).toBeTruthy();
    act(() => setPhraseStatus("thanks", "rejected"));
    expect(screen.getByText(/No approved phrases/)).toBeTruthy();
  });
});
