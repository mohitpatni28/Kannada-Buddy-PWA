import { expect, test } from "@playwright/test";

type MicrophoneBoundary = {
  microphoneTest: { requests: number; stops: number; recorders: number; recording: boolean; resolve: () => void };
};

for (const mode of ["deferred", "active", "constructor-failure", "start-failure"] as const) {
  test(`microphone tracks are released across ${mode}`, async ({ page }) => {
    // Only browser microphone/recording APIs are replaced. The real app handles
    // onboarding, user interaction, navigation, and component lifetime.
    await page.addInitScript((mode) => {
      const boundary = { requests: 0, stops: 0, recorders: 0, recording: false, resolve: () => {} };
      Object.assign(window, { microphoneTest: boundary });
      const stream = { getTracks: () => [{ stop: () => { boundary.stops += 1; } }] };
      Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
        getUserMedia: () => {
          boundary.requests += 1;
          if (mode !== "deferred") return Promise.resolve(stream);
          return new Promise((resolve) => { boundary.resolve = () => resolve(stream); });
        }
      } });
      class SyntheticRecorder {
        state = "inactive";
        mimeType = "audio/webm";
        onstop: (() => void) | null = null;
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        constructor() {
          if (mode === "constructor-failure") throw new Error("Synthetic constructor failure");
          boundary.recorders += 1;
        }
        start() {
          if (mode === "start-failure") throw new Error("Synthetic start failure");
          this.state = "recording";
          boundary.recording = true;
        }
        stop() {
          this.state = "inactive";
          boundary.recording = false;
          this.onstop?.();
        }
      }
      Object.defineProperty(window, "MediaRecorder", { configurable: true, value: SyntheticRecorder });
    }, mode);
    await page.goto("/");
    await page.getByRole("button", { name: /Speak Kannada.*Choose speaking/ }).click();
    await page.getByRole("button", { name: "Reveal and compare", exact: true }).click();
    await page.getByRole("button", { name: "Record myself", exact: true }).click();
    if (mode === "deferred") {
      await expect(page.getByRole("button", { name: "Record myself", exact: true })).toBeDisabled();
      await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Progress", exact: true }).click();
      await expect(page).toHaveURL(/\/review$/);
      await page.evaluate(() => (window as typeof window & MicrophoneBoundary).microphoneTest.resolve());
    } else if (mode === "active") {
      await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
      await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Progress", exact: true }).click();
      await expect(page).toHaveURL(/\/review$/);
    } else {
      await expect(page.getByText("Microphone access was not available. You can still practise aloud.", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Record myself", exact: true })).toBeEnabled();
    }
    await expect.poll(() => page.evaluate(() => (window as typeof window & MicrophoneBoundary).microphoneTest.stops)).toBe(1);
    const result = await page.evaluate(() => {
      const { requests, recorders, recording } = (window as typeof window & MicrophoneBoundary).microphoneTest;
      return { requests, recorders, recording };
    });
    expect(result.requests).toBe(1);
    expect(result.recording).toBe(false);
    expect(result.recorders).toBe(mode === "deferred" || mode === "constructor-failure" ? 0 : 1);
  });
}
