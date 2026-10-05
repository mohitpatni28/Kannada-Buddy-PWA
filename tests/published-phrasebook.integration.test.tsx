import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PhrasebookPage from "@/app/phrasebook/page";

vi.mock("@/data/course-catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/course-catalog")>();
  const original = actual.courseLearningConcepts[0];
  const reviewed = {
    ...original,
    id: `${original.id}-publication-fixture`,
    intent: "Published admin-reviewed fixture",
    form: { ...original.form, review: { status: "reviewed", source: "admin_review", reviewer: "Recorded reviewer", reviewedAt: "2026-10-05T00:00:00.000Z" } }
  };
  const phrase = (await import("@/data/library-reference")).adminLibraryPhrases.find((item) => item.automation)!;
  return {
    ...actual,
    courseLearningConcepts: [...actual.courseLearningConcepts, reviewed],
    courseSourcePhrases: new Map([...actual.courseSourcePhrases, [reviewed.id, { ...phrase, source: "other", sourceUrl: "https://example.org/source", license: "Fixture license" }]])
  };
});

describe("published course metadata presentation", () => {
  it("counts new published phrases dynamically and distinguishes admin review from native review", () => {
    render(<PhrasebookPage />);
    expect(screen.getByText(/101 everyday phrases/)).toBeTruthy();
    expect(screen.getByText(/16 native reviewed, 1 admin reviewed, 84 drafts awaiting review/)).toBeTruthy();
    const card = screen.getByText("Published admin-reviewed fixture").closest("article")!;
    expect(within(card).getByText("Admin reviewed")).toBeTruthy();
    expect(within(card).queryByText("native reviewed")).toBeNull();
    expect(within(card).getByText(/Admin review by Recorded reviewer/)).toBeTruthy();
    expect(within(card).getByRole("link", { name: "other" }).getAttribute("href")).toBe("https://example.org/source");
    expect(within(card).getByText(/Fixture license/)).toBeTruthy();
  });
});
