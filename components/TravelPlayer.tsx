"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PhraseItem } from "@/lib/types";
import { mergeOverrides } from "@/lib/libraryStore";
import { ratePhrase } from "@/lib/progress";
import { speakEnglish, speakKannada } from "@/lib/tts";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function TravelPlayer({ phrases }: { phrases: PhraseItem[] }) {
  const [library, setLibrary] = useState(phrases);
  const drill = useMemo(() => library.filter((phrase) => phrase.status === "approved"), [library]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rating, setRating] = useState(false);
  const [audioMessage, setAudioMessage] = useState("Tap Start Drill to enable audio.");
  const [ratingMessage, setRatingMessage] = useState("");
  const advanceTimer = useRef<number | null>(null);
  const ratingLock = useRef(false);
  const current = drill[index % drill.length];
  const progress = drill.length ? ((index + 1) / drill.length) * 100 : 0;

  useEffect(() => {
    setLibrary(mergeOverrides(phrases));
  }, [phrases]);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    []
  );

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

  const next = () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    ratingLock.current = false;
    setRating(false);
    setRatingMessage("");
    setIndex((value) => (value + 1) % drill.length);
  };
  const repeat = () => void playCurrent();

  const rateAndContinue = (confidence: 1 | 3) => {
    if (!current || ratingLock.current) return;
    ratingLock.current = true;
    setRating(true);
    ratePhrase(current.id, confidence);
    setRatingMessage(
      confidence === 3
        ? "Saved. It will be due on the Review tab in 7 days."
        : "Saved. It will be due on the Review tab tomorrow."
    );
    advanceTimer.current = window.setTimeout(next, 800);
  };

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
        <button className="button secondary" type="button" disabled={rating} onClick={() => rateAndContinue(3)}>
          Know it
        </button>
        <button className="button secondary" type="button" disabled={rating} onClick={() => rateAndContinue(1)}>
          Needs practice
        </button>
      </div>
      {ratingMessage ? <p className="small muted" role="status">{ratingMessage}</p> : null}
    </section>
  );
}
