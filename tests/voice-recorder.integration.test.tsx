import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VoiceRecorder } from "@/components/VoiceRecorder";

const NativeURL = URL;
afterEach(() => vi.unstubAllGlobals());

function setup(mode: "normal" | "constructor" | "start" = "normal") {
  const stopTrack = vi.fn();
  const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
  const getUserMedia = vi.fn<() => Promise<MediaStream>>().mockResolvedValue(stream);
  const created = vi.fn().mockReturnValue("blob:synthetic-recording");
  const revoked = vi.fn();
  const instances: FakeRecorder[] = [];
  class FakeRecorder {
    state = "inactive";
    mimeType = "audio/webm";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor() {
      if (mode === "constructor") throw new Error("Unsupported codec");
      instances.push(this);
    }
    start() {
      if (mode === "start") throw new Error("Cannot start recording");
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["synthetic audio"]) });
      this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("URL", class extends NativeURL {
    static createObjectURL = created;
    static revokeObjectURL = revoked;
  });
  return { stopTrack, stream, getUserMedia, created, revoked, instances };
}

it("stops a microphone stream when permission resolves after unmount", async () => {
  const boundary = setup();
  let resolvePermission!: (stream: MediaStream) => void;
  boundary.getUserMedia.mockReturnValue(new Promise((resolve) => { resolvePermission = resolve; }));
  const view = render(<VoiceRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  view.unmount();
  await act(async () => { resolvePermission(boundary.stream); });
  expect(boundary.stopTrack).toHaveBeenCalledOnce();
  expect(boundary.instances).toHaveLength(0);
  expect(boundary.created).not.toHaveBeenCalled();
});

it.each(["constructor", "start"] as const)("stops acquired tracks after recorder %s failure", async (mode) => {
  const boundary = setup(mode);
  render(<VoiceRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Microphone access was not available"));
  expect(boundary.stopTrack).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Record myself" })).toBeTruthy();
  expect(boundary.created).not.toHaveBeenCalled();
});

it("allows only one permission request while one is pending", async () => {
  const boundary = setup();
  let resolvePermission!: (stream: MediaStream) => void;
  boundary.getUserMedia.mockReturnValue(new Promise((resolve) => { resolvePermission = resolve; }));
  render(<VoiceRecorder />);
  const button = screen.getByRole("button", { name: "Record myself" });
  fireEvent.click(button);
  expect(screen.getByRole("status").textContent).toBe("Waiting for microphone permission…");
  expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.click(button);
  expect(boundary.getUserMedia).toHaveBeenCalledOnce();
  await act(async () => { resolvePermission(boundary.stream); });
  expect(screen.getByRole("button", { name: "Stop recording" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("Recording… say the phrase once.");
});

it("replaces a previous error with waiting feedback until a retried permission request resolves", async () => {
  const boundary = setup();
  boundary.getUserMedia.mockRejectedValueOnce(new Error("Permission denied"));
  render(<VoiceRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Microphone access was not available"));
  let resolvePermission!: (stream: MediaStream) => void;
  boundary.getUserMedia.mockReturnValue(new Promise((resolve) => { resolvePermission = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  expect(screen.getByRole("status").textContent).toBe("Waiting for microphone permission…");
  expect(boundary.instances).toHaveLength(0);
  await act(async () => { resolvePermission(boundary.stream); });
  expect(screen.getByRole("status").textContent).toBe("Recording… say the phrase once.");
  expect(boundary.getUserMedia).toHaveBeenCalledTimes(2);
});

it("releases active tracks on unmount without creating a recording URL", async () => {
  const boundary = setup();
  const view = render(<VoiceRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  await screen.findByRole("button", { name: "Stop recording" });
  view.unmount();
  expect(boundary.stopTrack).toHaveBeenCalledOnce();
  expect(boundary.instances[0].state).toBe("inactive");
  expect(boundary.created).not.toHaveBeenCalled();
});

it("records, stops, plays back, and revokes replaced and unmounted URLs", async () => {
  const boundary = setup();
  const view = render(<VoiceRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  fireEvent.click(await screen.findByRole("button", { name: "Stop recording" }));
  expect(boundary.stopTrack).toHaveBeenCalledOnce();
  expect(view.container.querySelector("audio")?.getAttribute("src")).toBe("blob:synthetic-recording");
  expect(screen.getByRole("status").textContent).toContain("Play your recording");
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  await screen.findByRole("button", { name: "Stop recording" });
  expect(boundary.revoked).toHaveBeenCalledWith("blob:synthetic-recording");
  fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
  view.unmount();
  expect(boundary.revoked).toHaveBeenLastCalledWith("blob:synthetic-recording");
});

it("reports denied permissions and allows another request", async () => {
  const boundary = setup();
  boundary.getUserMedia.mockRejectedValueOnce(new Error("Permission denied"));
  render(<VoiceRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Microphone access was not available"));
  expect(boundary.stopTrack).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Record myself" }));
  await screen.findByRole("button", { name: "Stop recording" });
  expect(boundary.getUserMedia).toHaveBeenCalledTimes(2);
});
