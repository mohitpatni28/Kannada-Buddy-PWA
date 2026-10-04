import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { LocalBackup } from "@/components/LocalBackup";
import { createBackup } from "@/lib/backup";
import { defaultReadingPreferences, savePreferences } from "@/lib/preferences";
import { usePreferences } from "@/lib/usePreferences";

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
function Observer() { const preferences = usePreferences(); return <p>Mode: {preferences?.learningMode ?? "unset"}</p>; }
const file = (text: string) => ({ size: text.length, text: async () => text });
it("previews a real backup without mutation, then restores and updates live preference consumers", async () => {
  savePreferences(defaultReadingPreferences); const text = JSON.stringify(createBackup(localStorage)); localStorage.clear();
  render(<><LocalBackup /><Observer /></>);
  fireEvent.change(screen.getByLabelText("Choose a backup to restore"), { target: { files: [file(text)] } });
  await screen.findByRole("button", { name: "Restore backup" });
  expect(localStorage.length).toBe(0); expect(screen.getByText("Mode: unset")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Restore backup" }));
  expect(screen.getByText("Mode: speaking_and_reading")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Backup restored on this browser");
});
it("rejects an invalid file and leaves existing data unchanged", async () => {
  savePreferences(defaultReadingPreferences); const original = localStorage.getItem("kannada-buddy-learning-preferences-v2");
  render(<LocalBackup />);
  fireEvent.change(screen.getByLabelText("Choose a backup to restore"), { target: { files: [file('{"version":2}')] } });
  await screen.findByRole("alert");
  expect(localStorage.getItem("kannada-buddy-learning-preferences-v2")).toBe(original);
  expect(screen.queryByRole("button", { name: "Restore backup" })).toBeNull();
});
it("downloads an actual validated JSON blob and excludes private unrelated storage", async () => {
  localStorage.setItem("secret", "private");
  const url = vi.fn((blob: Blob) => { expect(blob.size).toBeGreaterThan(0); return "blob:test"; }); Object.defineProperty(URL, "createObjectURL", { configurable: true, value: url });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<LocalBackup />); fireEvent.click(screen.getByRole("button", { name: "Download backup" }));
  expect(click).toHaveBeenCalledOnce(); expect(url).toHaveBeenCalledOnce();
  const blob = url.mock.calls[0]?.[0] as Blob | undefined;
  expect(blob?.type).toBe("application/json");
  const reader = new FileReader(); const loaded = new Promise<string>((resolve) => { reader.onload = () => resolve(String(reader.result)); });
  reader.readAsText(blob!); const text = await loaded;
  expect(JSON.parse(text).format).toBe("kannada-buddy-backup"); expect(text).not.toContain("private");
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Backup downloaded"));
});

it("ignores a slow previous file when a newer file is selected", async () => {
  const text = JSON.stringify(createBackup(localStorage));
  let finish!: (text: string) => void;
  const slow = { size: text.length, text: () => new Promise<string>((resolve) => { finish = resolve; }) };
  render(<LocalBackup />);
  const input = screen.getByLabelText("Choose a backup to restore");
  fireEvent.change(input, { target: { files: [slow] } });
  fireEvent.change(input, { target: { files: [file("bad")] } });
  await screen.findByRole("alert");
  await act(async () => { finish(text); });
  expect(screen.queryByRole("button", { name: "Restore backup" })).toBeNull();
});

it("shows progress available in a legacy-only backup preview", async () => {
  const now = "2026-10-04T06:00:00.000Z";
  localStorage.setItem("kannada-buddy-progress", JSON.stringify({ "greet-hello": { phraseId: "greet-hello", confidence: 3, correctCount: 1, wrongCount: 0, lastSeenAt: now, nextReviewAt: now } }));
  const text = JSON.stringify(createBackup(localStorage)); localStorage.clear();
  render(<LocalBackup />);
  fireEvent.change(screen.getByLabelText("Choose a backup to restore"), { target: { files: [file(text)] } });
  await screen.findByText("1 legacy phrase records will migrate after restore.");
  expect(localStorage.length).toBe(0);
});
