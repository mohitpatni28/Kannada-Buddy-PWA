"use client";

export type SpeakResult = {
  ok: boolean;
  message: string;
  voiceName?: string;
};

type KannadaSpeechInput = {
  script?: string;
  roman: string;
};

function waitForVoices() {
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }

    const timer = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 700);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], preferred: string[]) {
  return preferred
    .map((prefix) => voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)))
    .find((voice): voice is SpeechSynthesisVoice => Boolean(voice));
}

function speak(text: string, options: { lang: string; voice?: SpeechSynthesisVoice; rate: number }) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.voice?.lang ?? options.lang;
  utterance.rate = options.rate;
  utterance.pitch = 1;
  if (options.voice) utterance.voice = options.voice;
  window.speechSynthesis.speak(utterance);
}

export async function speakKannada(input: KannadaSpeechInput): Promise<SpeakResult> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { ok: false, message: "This browser does not support speech synthesis." };
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const voices = await waitForVoices();
  const kannadaVoice = pickVoice(voices, ["kn"]);
  if (kannadaVoice && input.script) {
    speak(input.script, { lang: "kn-IN", voice: kannadaVoice, rate: 0.84 });
    return { ok: true, message: `Playing Kannada voice: ${kannadaVoice.name}`, voiceName: kannadaVoice.name };
  }

  const fallbackVoice =
    pickVoice(voices, ["en-in", "hi", "en"]) ??
    voices.find((voice) => voice.lang.toLowerCase().includes("in")) ??
    voices[0];

  speak(input.roman, { lang: fallbackVoice?.lang ?? "en-IN", voice: fallbackVoice, rate: 0.78 });
  return {
    ok: true,
    message: fallbackVoice
      ? `No Kannada voice found. Playing romanized Kannada with ${fallbackVoice.name}.`
      : "No installed voices were reported. Trying browser default voice with romanized Kannada.",
    voiceName: fallbackVoice?.name
  };
}

export async function speakEnglish(text: string): Promise<SpeakResult> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { ok: false, message: "This browser does not support speech synthesis." };
  }

  const voices = await waitForVoices();
  const voice = pickVoice(voices, ["en-in", "en"]) ?? voices[0];
  speak(text, { lang: "en-IN", voice, rate: 0.92 });
  return { ok: true, message: voice ? `Playing ${voice.name}.` : "Playing browser default voice." };
}
