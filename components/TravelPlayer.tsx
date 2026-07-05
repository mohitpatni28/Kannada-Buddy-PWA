"use client";

import { useMemo, useState } from "react";
import type { PhraseItem } from "@/lib/types";
import { ratePhrase } from "@/lib/progress";
import { speakEnglish, speakKannada } from "@/lib/tts";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function TravelPlayer({ phrases }: { phrases: PhraseItem[] }) {
  const drill = useMemo(() => phrases.filter((phrase) => phrase.status === "approved"), [phrases]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioMessage, setAudioMessage] = useState("Tap Start Drill to enable audio.");
  const current = drill[index % drill.length];
  const progress = drill.length ? ((index + 1) / drill.length) * 100 : 0;

  const playCurrent = async () => {
    if (!current) return;
    setPlaying(true);
    window.speechSynthesis?.cancel();
    const englishResult = await speakEnglish(current.english);
    setAudioMessage(englishResult.message);
    await wait(2000);
    const kannadaResult = await speakKannada({ script: current.kannadaScript, roman: current.kannadaRoman });
    setAudioMessage(kannadaResult.message);
    await wait(2400);
    await speakKannada({ script: current.kannadaScript, roman: current.kannadaRoman });
    await wait(1400);
    setPlaying(false);
  };

  const next = () => setIndex((value) => Math.min(value + 1, Math.max(drill.length - 1, 0)));
  const repeat = () => void playCurrent();

  if (!current) {
    return <p className="muted">No approved phrases are ready for travel mode.</p>;
  }

  return (
    <section className="travel-stage" aria-live="polite">
      <div className="progress-bar" aria-label="Drill progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="travel-prompt">
        <p className="pill" style={{ justifySelf: "center" }}>
          {index + 1} of {drill.length}
        </p>
        <p className="english">{current.english}</p>
        <p className="roman">{current.kannadaRoman}</p>
        <p className="script">{current.kannadaScript}</p>
        <p className="small muted">{audioMessage}</p>
      </div>
      <div className="action-row" style={{ justifyContent: "center" }}>
        <button className="button" type="button" disabled={playing} onClick={() => void playCurrent()}>
          {playing ? "Playing" : "Start Drill"}
        </button>
        <button className="button secondary icon-button" type="button" title="Repeat" aria-label="Repeat" onClick={repeat}>
          ↻
        </button>
        <button className="button secondary icon-button" type="button" title="Next" aria-label="Next" onClick={next}>
          →
        </button>
      </div>
      <div className="action-row" style={{ justifyContent: "center" }}>
        <button className="button secondary" type="button" onClick={() => ratePhrase(current.id, 3)}>
          I know this
        </button>
        <button className="button secondary" type="button" onClick={() => ratePhrase(current.id, 1)}>
          Need practice
        </button>
      </div>
    </section>
  );
}
