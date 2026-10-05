import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AdminPhraseCard } from "@/components/AdminPhraseCard";
import { useLibraryPhrases } from "@/lib/useLibraryPhrases";
import { adminPhrases } from "./fixtures";

const storageKey = "kannada-buddy-library-overrides";
const source = adminPhrases[2];
function CardWithStorage() {
  const [phrase] = useLibraryPhrases([source]);
  return <AdminPhraseCard phrase={phrase} />;
}
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it("keeps a failed edit open and preserves stored content until a successful retry", () => {
  const stored = JSON.stringify({ [source.id]: { id: source.id, english: "Stored meaning", usageNote: "Keep this note" }, hello: { id: "hello", english: "Unrelated edit" } });
  localStorage.setItem(storageKey, stored);
  render(<CardWithStorage />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByRole("textbox", { name: "English meaning" }), { target: { value: "Retry meaning" } });
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new DOMException("Full", "QuotaExceededError"); });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("alert").textContent).toContain("Could not save the edit");
  expect(screen.getByRole("textbox", { name: "English meaning" })).toHaveProperty("value", "Retry meaning");
  expect(localStorage.getItem(storageKey)).toBe(stored);
  write.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByRole("textbox", { name: "English meaning" })).toBeNull();
  expect(screen.getByText("Retry meaning", { selector: ".english" })).toBeTruthy();
  const saved = JSON.parse(localStorage.getItem(storageKey)!);
  expect(saved[source.id]).toMatchObject({ english: "Retry meaning", usageNote: "Keep this note", status: source.status });
  expect(saved.hello).toEqual({ id: "hello", english: "Unrelated edit" });
});

it("keeps a failed approval undecided, then retries without losing existing edits", () => {
  const stored = JSON.stringify({ [source.id]: { id: source.id, english: "Edited meaning", usageNote: "Preserve context" } });
  localStorage.setItem(storageKey, stored);
  render(<CardWithStorage />);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new DOMException("Full", "QuotaExceededError"); });
  fireEvent.click(screen.getByRole("button", { name: "Approve for export" }));
  expect(screen.getByRole("alert").textContent).toContain("Could not save the decision");
  expect(screen.getByText("raw imported")).toBeTruthy();
  expect(screen.queryByText("approved", { exact: true })).toBeNull();
  expect(localStorage.getItem(storageKey)).toBe(stored);
  write.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Approve for export" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("approved", { exact: true })).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(storageKey)!)[source.id]).toMatchObject({ id: source.id, english: "Edited meaning", usageNote: "Preserve context", status: "approved" });
});
