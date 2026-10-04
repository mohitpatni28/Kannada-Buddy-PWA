import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PhrasebookPage from "@/app/phrasebook/page";
import { courseLearningConcepts, courseScenarios, courseSourcePhrases } from "@/data/course-catalog";

describe("everyday phrasebook", () => {
  it("shows honest review labels and source links for all selected drafts", () => {
    render(<PhrasebookPage />);
    expect(screen.getByRole("status").textContent).toBe("100 course phrases");
    expect(screen.getAllByText("native reviewed")).toHaveLength(16);
    expect(screen.getAllByText("AI draft · native review pending")).toHaveLength(84);
    expect(screen.getAllByRole("link", { name: "Wikivoyage" })).toHaveLength(84);
    for (const link of screen.getAllByRole("link", { name: "Attribution and changes" })) expect(link.getAttribute("href")).toBe("/sources");
    const draft = courseLearningConcepts.find((item) => courseSourcePhrases.has(item.id))!;
    const article = screen.getByText(draft.intent).closest("article")!;
    expect(within(article).getByRole("link", { name: "Wikivoyage" }).getAttribute("href")).toBe(courseSourcePhrases.get(draft.id)!.sourceUrl);
  });

  it("filters every scenario and searches imported script without losing status", () => {
    render(<PhrasebookPage />);
    for (const scenario of courseScenarios) {
      fireEvent.click(screen.getByRole("button", { name: scenario.title }));
      expect(screen.getByRole("button", { name: scenario.title }).getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("region", { name: "Phrase results" }).querySelectorAll("article")).toHaveLength(courseLearningConcepts.filter((item) => item.missionId === scenario.id).length);
    }
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    const draft = courseLearningConcepts.find((item) => courseSourcePhrases.has(item.id))!;
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: `  ${draft.form.kannadaScript}  ` } });
    expect(screen.getByText(draft.intent)).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-such-course-item" } });
    expect(screen.getByRole("status").textContent).toBe("0 course phrases");
    expect(screen.getByText(/No matching course phrase/)).toBeTruthy();
  });
});
