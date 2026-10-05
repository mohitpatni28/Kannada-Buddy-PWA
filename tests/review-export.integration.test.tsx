import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ReviewExport } from "@/components/ReviewExport";
import { sourceAdminLibraryPhrases } from "@/data/library-reference";
import { useLibraryPhrases } from "@/lib/useLibraryPhrases";
import { setPhraseStatus, updatePhraseOverride } from "@/lib/libraryStore";
import { validateReviewBundle } from "@/lib/reviewPublishing";

const source = sourceAdminLibraryPhrases.find((phrase) => phrase.status === "ai_draft" && phrase.kannadaScript)!;
function ExportHarness() { return <ReviewExport sources={sourceAdminLibraryPhrases} phrases={useLibraryPhrases(sourceAdminLibraryPhrases)} />; }
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
it("exports actual approved edits only after reviewer and all manual attestations", async () => {
  const blobs: Blob[] = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => { blobs.push(blob); return "blob:review"; } });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<ExportHarness />);
  let button = screen.getByRole("button", { name: "Export approved reviews" });
  expect(button).toHaveProperty("disabled", true);
  act(() => { updatePhraseOverride(source.id, { english: "Edited meaning" }); setPhraseStatus(source.id, "approved"); });
  button = screen.getByRole("button", { name: "Export approved reviews" });
  fireEvent.change(screen.getByLabelText("Reviewer name"), { target: { value: "Test reviewer" } });
  for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);
  expect(button).toHaveProperty("disabled", false);
  fireEvent.click(button);
  expect(blobs).toHaveLength(1);
  const text = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blobs[0]); });
  const bundle = validateReviewBundle(JSON.parse(text), sourceAdminLibraryPhrases);
  expect(bundle.records).toHaveLength(1);
  expect(bundle.records[0]).toMatchObject({ id: source.id, content: { english: "Edited meaning" }, review: { reviewer: "Test reviewer", checks: { meaning: true, script: true, romanization: true, context: true } } });
  expect(text).not.toContain("kannada-buddy-learning-state");
  expect(screen.getByRole("status").textContent).toContain("live site changes after validation and redeployment");
  expect(button).toHaveProperty("disabled", true);
});
it("does not export held or rejected records and reports invalid approved content", () => {
  setPhraseStatus(source.id, "rejected");
  render(<ExportHarness />);
  expect(screen.getByRole("button", { name: "Export approved reviews" })).toHaveProperty("disabled", true);
  act(() => { updatePhraseOverride(source.id, { kannadaScript: "" }); setPhraseStatus(source.id, "approved"); });
  fireEvent.change(screen.getByLabelText("Reviewer name"), { target: { value: "Reviewer" } });
  for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: "Export approved reviews" }));
  expect(screen.getByRole("alert").textContent).toMatch(/script|invalid/i);
});

it("invalidates review confirmations when an approved phrase changes", () => {
  setPhraseStatus(source.id, "approved");
  render(<ExportHarness />);
  fireEvent.change(screen.getByLabelText("Reviewer name"), { target: { value: "Reviewer" } });
  for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);
  expect(screen.getByRole("button", { name: "Export approved reviews" })).toHaveProperty("disabled", false);
  act(() => updatePhraseOverride(source.id, { usageNote: "Changed after the checks" }));
  expect(screen.getAllByRole("checkbox").every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
  expect(screen.getByRole("button", { name: "Export approved reviews" })).toHaveProperty("disabled", true);
});
