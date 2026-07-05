"use client";

import { useState } from "react";
import type { PhraseItem } from "@/lib/types";
import { AudioButton } from "@/components/AudioButton";

export function QuizCard({ phrase }: { phrase: PhraseItem }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="panel">
      <div className="meta-row">
        <span className="pill">listening quiz</span>
        <AudioButton script={phrase.kannadaScript} roman={phrase.kannadaRoman} label="Play quiz audio" />
      </div>
      <h2>What did you hear?</h2>
      {revealed ? (
        <div className="phrase-main">
          <p className="english">{phrase.english}</p>
          <p className="roman">{phrase.kannadaRoman}</p>
          <p className="script">{phrase.kannadaScript}</p>
        </div>
      ) : (
        <button className="button secondary" type="button" onClick={() => setRevealed(true)}>
          Reveal answer
        </button>
      )}
    </section>
  );
}
