"use client";

import { useState } from "react";
import { AudioButton } from "@/components/AudioButton";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import type { LearningConcept, LearningPreferences, PracticeOutcome, ReadingOutcome } from "@/lib/types";

export function ConceptPractice({
  concept,
  preferences,
  position,
  total,
  corrective = false,
  onComplete
}: {
  concept: LearningConcept;
  preferences: LearningPreferences;
  position: number;
  total: number;
  corrective?: boolean;
  onComplete: (outcome: PracticeOutcome, reading?: ReadingOutcome) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [showScript, setShowScript] = useState(preferences.learningMode === "speaking_and_reading");
  const [showRoman, setShowRoman] = useState(preferences.romanization === "always");
  const [speakingOutcome, setSpeakingOutcome] = useState<PracticeOutcome | null>(null);
  const readingMode = preferences.learningMode === "speaking_and_reading";

  const rateSpeaking = (outcome: PracticeOutcome) => {
    if (!readingMode) {
      onComplete(outcome);
      return;
    }
    setSpeakingOutcome(outcome);
    setShowScript(true);
    setShowRoman(preferences.romanization === "always");
  };

  const rateReading = (outcome: ReadingOutcome) => {
    if (speakingOutcome) onComplete(speakingOutcome, outcome);
  };

  return (
    <article className="practice-card surface">
      <div className="practice-progress">
        <span>{position} of {total}</span>
        <span>{corrective ? "Corrective retry" : concept.missionTitle}</span>
      </div>
      {concept.contentTier === "ai_draft" ? (
        <p className="learning-content-notice small">
          <strong>AI reference draft</strong> · Not human or native reviewed. Learn it as provisional reference content.
        </p>
      ) : null}
      {concept.contentTier === "ai_draft_caution" ? (
        <p className="learning-content-notice caution small">
          <strong>AI draft · use caution</strong> · Higher-risk reference content, not human or native reviewed.
        </p>
      ) : null}
      <div className="progress-bar" aria-label={`Practice item ${position} of ${total}`}>
        <span style={{ width: `${(position / total) * 100}%` }} />
      </div>

      {!revealed ? (
        <div className="practice-prompt">
          <p className="eyebrow">Say it in Kannada</p>
          <h2>{concept.intent}</h2>
          <p className="lede">{concept.situation}</p>
          <p className="attempt-cue">{corrective
            ? "Retrieve it again without looking. This successful repair is what makes the correction stick."
            : "Try aloud before revealing. A difficult attempt is part of learning."}</p>
          <button className="button" type="button" onClick={() => setRevealed(true)}>Reveal and compare</button>
        </div>
      ) : !speakingOutcome ? (
        <div className="practice-answer">
          <div className="answer-heading">
            <p className="eyebrow">Compare your answer</p>
            <AudioButton script={concept.form.kannadaScript} roman={concept.form.kannadaRoman} audioUrl={concept.audioUrl} label="Play Kannada reference" />
          </div>
          {showScript ? <p className="answer-script kannada-font" lang="kn">{concept.form.kannadaScript}</p> : null}
          {showRoman || !readingMode ? <p className="answer-roman">{concept.form.kannadaRoman}</p> : null}
          <div className="action-row">
            {!showScript ? <button className="button secondary" type="button" onClick={() => setShowScript(true)}>Show Kannada script</button> : null}
            {readingMode && !showRoman ? <button className="button secondary" type="button" onClick={() => setShowRoman(true)}>Show romanization</button> : null}
          </div>
          {concept.pattern ? <p className="pattern-note"><strong>Pattern</strong> {concept.pattern}</p> : null}
          {concept.pronunciationNote ? <p className="small muted">Pronunciation: {concept.pronunciationNote}</p> : null}
          {concept.usageNote ? <p className="small muted">Use: {concept.usageNote}</p> : null}
          <VoiceRecorder />
          <div className="rating-block">
            <p className="small"><strong>{corrective ? "Did the correction stick?" : "How did speaking go?"}</strong></p>
            <div className="rating-grid">
              <button className="button" type="button" onClick={() => rateSpeaking("independent")}>Said it</button>
              <button className="button secondary" type="button" onClick={() => rateSpeaking("hinted")}>Needed help</button>
              <button className="button secondary" type="button" onClick={() => rateSpeaking("missed")}>Not yet</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="reading-check">
          <p className="eyebrow">Reading minute</p>
          <h2>Read this aloud</h2>
          <p className="answer-script kannada-font" lang="kn">{concept.form.kannadaScript}</p>
          <p className="small muted">Apply the letters and vowel-sign patterns from the script pathway to this real phrase.</p>
          {showRoman ? <p className="answer-roman">{concept.form.kannadaRoman}</p> : (
            <button className="button secondary" type="button" onClick={() => setShowRoman(true)}>Show reading help</button>
          )}
          <div className="rating-grid">
            <button className="button" type="button" onClick={() => rateReading(showRoman ? "hinted" : "read")}>{showRoman ? "Read with help" : "Read it"}</button>
            <button className="button secondary" type="button" onClick={() => rateReading("skipped")}>Skip reading</button>
          </div>
        </div>
      )}
    </article>
  );
}
