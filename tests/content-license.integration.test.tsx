import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SourcesPage from "@/app/sources/page";
import { wikivoyagePhrases } from "@/data/wikivoyage-phrases";

// Quality review and reuse rights are separate; license changes must retain source records.
describe("content license attribution", () => {
  it("shows the chosen original-text license separately from source-derived material", () => {
    render(<SourcesPage />);
    const original = screen.getByRole("heading", { name: "Manual curated phrases" }).closest("article");
    const imported = screen.getByRole("heading", { name: "Wikivoyage Kannada phrasebook" }).closest("article");
    if (!original || !imported) throw new Error("Attribution cards are missing");
    expect(within(original).getByText("CC BY-SA 4.0")).toBeTruthy();
    expect(within(original).getByRole("link", { name: "Open source" }).getAttribute("href")).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
    expect(within(imported).getByText(/LLM edits and human review retain source obligations/)).toBeTruthy();
    expect(within(imported).getByRole("link", { name: "Open source" }).getAttribute("href")).toBe("https://en.wikivoyage.org/wiki/Kannada_phrasebook");
    expect(screen.getByText(/Content licensing does not certify native-speaker or audio review/)).toBeTruthy();
  });
  it("retains original imported license labels and provenance rather than relicensing them", () => {
    expect(wikivoyagePhrases.length).toBeGreaterThan(0);
    for (const phrase of wikivoyagePhrases) {
      expect(phrase.source).toBe("wikivoyage");
      expect(phrase.license).toBe("CC BY-SA");
      expect(phrase.sourceUrl).toMatch(/^https:\/\/en\.wikivoyage\.org\//);
      expect(phrase.status).toBe("raw_imported");
    }
  });
});
