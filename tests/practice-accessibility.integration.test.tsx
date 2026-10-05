import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConceptPractice } from "@/components/ConceptPractice";
import { OrthographyPractice } from "@/components/OrthographyPractice";
import { AudioButton } from "@/components/AudioButton";
import { learningConcepts } from "@/data/learning-concepts";
import { orthographyUnits } from "@/data/orthography-units";
import { defaultSpeakingPreferences } from "@/lib/preferences";

afterEach(() => vi.unstubAllGlobals());
it("moves focus to revealed script instead of the removed help button", () => {
  const concept = learningConcepts[0];
  render(<ConceptPractice concept={concept} preferences={defaultSpeakingPreferences} position={1} total={2} onComplete={vi.fn()} />);
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: concept.intent }));
  fireEvent.click(screen.getByRole("button", { name: "Reveal and compare" }));
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Compare your answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Show Kannada script" }));
  expect(document.activeElement?.textContent).toBe(concept.form.kannadaScript);
  expect(document.activeElement?.getAttribute("lang")).toBe("kn");
});
it("focuses correction and retry prompts and records a helped recognition", () => {
  const unit = orthographyUnits[0];
  const question = unit.recognition[0];
  const complete = vi.fn();
  render(<OrthographyPractice unit={unit} previousAttempts={0} onComplete={complete} />);
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: unit.title }));
  fireEvent.click(screen.getByRole("button", { name: "Try one recognition check" }));
  fireEvent.click(screen.getByRole("button", { name: question.options.find((option) => option !== question.answer)! }));
  expect(document.activeElement?.textContent).toContain("Look once:");
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Try again now" }));
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: question.prompt }));
  fireEvent.click(screen.getByRole("button", { name: question.answer }));
  expect(complete).toHaveBeenCalledWith("hinted");
});
it("names reference audio by phrase and announces unsupported device audio politely", async () => {
  vi.stubGlobal("speechSynthesis", undefined);
  // Remove the property to reproduce the browser's unsupported API boundary.
  Reflect.deleteProperty(window, "speechSynthesis");
  const { container } = render(<AudioButton roman="Namaskāra" />);
  const status = container.querySelector("[aria-live='polite']")!;
  expect(status.textContent).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Play Kannada for Namaskāra" }));
  await waitFor(() => expect(status.textContent).toContain("This browser does not support speech synthesis."));
  expect(status.textContent).toContain("not reviewed");
});
it("announces packaged audio only after playback succeeds", async () => {
  const play = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("Audio", class { play = play; });
  const { container } = render(<AudioButton roman="Namaskāra" audioUrl="/audio/hello.wav" />);
  fireEvent.click(screen.getByRole("button", { name: "Play Kannada for Namaskāra" }));
  await waitFor(() => expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("Playing reviewed packaged Kannada audio."));
  expect(play).toHaveBeenCalledOnce();
});

it("reports failed packaged playback without claiming the audio played", async () => {
  vi.stubGlobal("Audio", class { play = vi.fn().mockRejectedValue(new Error("unavailable")); });
  vi.stubGlobal("speechSynthesis", undefined);
  Reflect.deleteProperty(window, "speechSynthesis");
  const { container } = render(<AudioButton roman="Namaskāra" audioUrl="/audio/missing.wav" />);
  fireEvent.click(screen.getByRole("button", { name: "Play Kannada for Namaskāra" }));
  await waitFor(() => expect(container.querySelector("[aria-live='polite']")?.textContent).toContain("Packaged audio was unavailable."));
  expect(container.textContent).not.toContain("Playing reviewed packaged");
});
it("provides recoverable feedback if the browser speech engine throws", async () => {
  vi.stubGlobal("speechSynthesis", { cancel: () => { throw new Error("engine unavailable"); } });
  const { container } = render(<AudioButton roman="Namaskāra" />);
  fireEvent.click(screen.getByRole("button", { name: "Play Kannada for Namaskāra" }));
  await waitFor(() => expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("Audio could not play. Try again or read the pronunciation shown."));
});
