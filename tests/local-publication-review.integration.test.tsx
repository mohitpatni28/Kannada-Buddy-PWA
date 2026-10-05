import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PhraseCard } from "@/components/PhraseCard";
import { mergeOverrides, updatePhraseOverride } from "@/lib/libraryStore";
import { useLibraryPhrases } from "@/lib/useLibraryPhrases";
import type { PhraseItem } from "@/lib/types";
import { adminPhrases, now } from "./fixtures";

const published: PhraseItem = {
  ...adminPhrases[2], status: "approved", kannadaScript: "ನಮಸ್ಕಾರ", usageNote: "Published usage",
  publicationReview: {
    reviewer: "Fixture reviewer", reviewedAt: now,
    checks: { meaning: true, script: true, romanization: true, context: true }
  }
};
function PublishedCard() {
  const [phrase] = useLibraryPhrases([published]);
  return <PhraseCard phrase={phrase} />;
}
beforeEach(() => localStorage.clear());

describe("published review provenance after local edits", () => {
  it.each(["english", "kannadaRoman", "kannadaScript", "category", "usageNote"] as const)("invalidates review when %s changes without mutating the shared source", (field) => {
    const merged = mergeOverrides([published], { [published.id]: { id: published.id, [field]: `${published[field]} changed` } })[0];
    expect(merged.publicationReview).toBeUndefined();
    expect(published.publicationReview?.reviewer).toBe("Fixture reviewer");
  });

  it("preserves legitimate review for unchanged wording and unrelated local settings", () => {
    const merged = mergeOverrides([published], { [published.id]: {
      id: published.id, english: published.english, kannadaScript: published.kannadaScript,
      usageNote: published.usageNote, tags: ["local tag"], isBengaluruPractical: true
    } })[0];
    expect(merged.publicationReview).toEqual(published.publicationReview);
    expect(merged.tags).toEqual(["local tag"]);
    const withoutNote = { ...published, usageNote: undefined };
    expect(mergeOverrides([withoutNote], { [published.id]: { id: published.id, usageNote: "" } })[0].publicationReview).toEqual(published.publicationReview);
  });

  it("never obtains publication provenance from local storage", () => {
    const unreviewed = { ...published, publicationReview: undefined };
    expect(mergeOverrides([unreviewed], { [published.id]: { id: published.id, publicationReview: published.publicationReview } })[0].publicationReview).toBeUndefined();
  });

  it("relabels changed local wording immediately and restores the published label when wording is restored", () => {
    render(<PublishedCard />);
    expect(screen.getByText("Published admin review")).toBeTruthy();
    act(() => updatePhraseOverride(published.id, { english: "Changed locally after publication" }));
    expect(screen.queryByText("Published admin review")).toBeNull();
    expect(screen.getByText("Locally approved · AI source")).toBeTruthy();
    expect(screen.getByText("Changed locally after publication")).toBeTruthy();
    act(() => updatePhraseOverride(published.id, { english: published.english }));
    expect(screen.getByText("Published admin review")).toBeTruthy();
  });
});
