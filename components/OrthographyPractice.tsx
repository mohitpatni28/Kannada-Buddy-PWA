"use client";

import { useEffect, useRef, useState } from "react";
import type { OrthographyUnit, PracticeOutcome } from "@/lib/types";

export function OrthographyPractice({
  unit,
  previousAttempts,
  onComplete
}: {
  unit: OrthographyUnit;
  previousAttempts: number;
  onComplete: (outcome: PracticeOutcome) => void;
}) {
  const [stage, setStage] = useState<"study" | "test" | "retry">("study");
  const [madeError, setMadeError] = useState(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { stageHeading.current?.focus(); }, [stage]);
  const question = unit.recognition[previousAttempts % unit.recognition.length];

  const choose = (answer: string) => {
    if (answer === question.answer) {
      onComplete(madeError ? "hinted" : "independent");
      return;
    }
    setMadeError(true);
    setStage("retry");
  };

  return (
    <article className="practice-card surface orthography-card">
      <div className="practice-progress">
        <span>Kannada script</span>
        <span>Unit {unit.order}</span>
      </div>
      {stage === "study" ? (
        <div className="grid">
          <div>
            <p className="eyebrow">Alphabet and decoding</p>
            <h2 ref={stageHeading} tabIndex={-1}>{unit.title}</h2>
            <p className="lede">{unit.explanation}</p>
          </div>
          <div className="grapheme-grid" aria-label={`${unit.title} symbols`}>
            {unit.symbols.map((item) => (
              <div className="grapheme-tile" key={item.grapheme}>
                <strong className="kannada-font" lang="kn">{item.grapheme}</strong>
                <span>{item.sound}</span>
                <small>{item.cue}</small>
                {item.example ? <small className="kannada-font" lang="kn">{item.example}</small> : null}
              </div>
            ))}
          </div>
          <button className="button" type="button" onClick={() => setStage("test")}>Try one recognition check</button>
        </div>
      ) : stage === "test" ? (
        <div className="grid">
          <p className="eyebrow">Recognise without romanization</p>
          <h2 ref={stageHeading} tabIndex={-1}>{question.prompt}</h2>
          <div className="grapheme-options" aria-label="Kannada letter choices">
            {question.options.map((option) => (
              <button className="grapheme-option kannada-font" lang="kn" type="button" key={option} onClick={() => choose(option)}>{option}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid">
          <p className="eyebrow">Correct, then retrieve</p>
          <h2 ref={stageHeading} tabIndex={-1}>Look once: <span className="kannada-font" lang="kn">{question.answer}</span> means {unit.symbols.find((item) => item.grapheme === question.answer)?.sound}.</h2>
          <p className="muted">Hide the answer mentally, then try the same choice again.</p>
          <div className="action-row">
            <button className="button" type="button" onClick={() => setStage("test")}>Try again now</button>
            <button className="button secondary" type="button" onClick={() => onComplete("missed")}>Review tomorrow</button>
          </div>
        </div>
      )}
    </article>
  );
}
