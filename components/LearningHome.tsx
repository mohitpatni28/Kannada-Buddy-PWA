"use client";

import Link from "next/link";
import { useState } from "react";
import { learningConcepts } from "@/data/learning-concepts";
import { orthographyUnits } from "@/data/orthography-units";
import { referenceConceptsFor } from "@/data/reference-learning-concepts";
import { ConceptPractice } from "@/components/ConceptPractice";
import { Onboarding } from "@/components/Onboarding";
import { OrthographyPractice } from "@/components/OrthographyPractice";
import { recordOrthography, recordPractice, selectOrthographyUnit, selectSessionConcepts } from "@/lib/learningStore";
import { savePreferences } from "@/lib/preferences";
import { usePreferences } from "@/lib/usePreferences";
import { useLearningState } from "@/lib/useLearningState";
import { useHydrated } from "@/lib/useHydrated";
import type { LearningPreferences, LearningState, PracticeOutcome, ReadingOutcome } from "@/lib/types";

export function LearningHome() {
  const ready = useHydrated();
  const preferences = usePreferences();
  const learningState = useLearningState();
  if (!ready) return <p className="panel muted">Preparing today’s lesson…</p>;
  if (!preferences) return <Onboarding onChoose={savePreferences} />;
  return <LearningSession key={JSON.stringify(preferences)} preferences={preferences} initialState={learningState} />;
}

function LearningSession({ preferences, initialState }: { preferences: LearningPreferences; initialState: LearningState }) {
  const [learningState, setLearningState] = useState(initialState);
  const [index, setIndex] = useState(0);
  const [relearningIds, setRelearningIds] = useState<string[]>([]);
  const [orthographyComplete, setOrthographyComplete] = useState(false);

  // Choose once at session start; ratings update progress without replacing the queue.
  const [session] = useState(() => {
    const courseConcepts = [
      ...(preferences.referenceDeck === "ai_drafts_only" ? [] : learningConcepts),
      ...referenceConceptsFor(preferences.referenceDeck)
    ];
    return selectSessionConcepts(courseConcepts, initialState, preferences.sessionMinutes);
  });
  const [orthographyUnit] = useState(() => preferences.learningMode === "speaking_and_reading"
    ? selectOrthographyUnit(orthographyUnits, initialState)
    : undefined);

  if (orthographyUnit && !orthographyComplete) {
    return (
      <div className="page learning-page">
        <header className="learning-header">
          <div>
            <p className="eyebrow">Today · script pathway</p>
            <h1>Decode Kannada step by step</h1>
          </div>
          <Link className="button secondary" href="/settings">Speak + read</Link>
        </header>
        <OrthographyPractice
          unit={orthographyUnit}
          previousAttempts={learningState.orthography[orthographyUnit.id]?.attempts ?? 0}
          onComplete={(outcome) => {
            setLearningState(recordOrthography(orthographyUnit.id, outcome));
            setOrthographyComplete(true);
          }}
        />
      </div>
    );
  }

  const corrective = index >= session.length;
  const currentId = corrective ? relearningIds[index - session.length] : session[index]?.id;
  const current = currentId ? session.find((concept) => concept.id === currentId) : undefined;
  const complete = (outcome: PracticeOutcome, reading?: ReadingOutcome) => {
    if (!current) return;
    if (!corrective && outcome !== "independent" && !relearningIds.includes(current.id)) {
      setRelearningIds((items) => [...items, current.id]);
    }
    const nextState = recordPractice(current.id, outcome, reading, { corrective });
    setLearningState(nextState);
    setIndex((value) => value + 1);
  };

  if (!current) {
    const learned = Object.keys(learningState.concepts).length;
    const caughtUp = session.length === 0 && relearningIds.length === 0;
    return (
      <div className="page completion-page">
        <section className="hero compact-hero">
          <p className="eyebrow">{caughtUp ? "Reviews complete" : "Session complete"}</p>
          <h1>{caughtUp ? "You’re caught up." : "Kannada, made usable."}</h1>
          <p className="lede">{caughtUp
            ? "Nothing is due yet. Waiting before the next retrieval makes the memory work harder—and last longer."
            : `You practised ${session.length} communicative concepts${relearningIds.length ? ` and repaired ${relearningIds.length} difficult ${relearningIds.length === 1 ? "item" : "items"}` : ""}. The next session will mix due reviews with a small amount of new material.`}</p>
        </section>
        <div className="stat-row">
          <span className="pill">{learned} concepts started</span>
          <span className="pill">{learningState.evidence.length} learning attempts</span>
          {preferences.learningMode === "speaking_and_reading" ? <span className="pill">{Object.keys(learningState.orthography).length} script units started</span> : null}
          <span className="pill">{preferences.learningMode === "speaking_and_reading" ? "speaking + reading" : "speaking"}</span>
        </div>
        <div className="action-row">
          <Link className="button" href="/review">See learning progress</Link>
          <Link className="button secondary" href="/phrasebook">Open phrasebook</Link>
        </div>
      </div>
    );
  }

  const completed = Object.keys(learningState.concepts).length;
  return (
    <div className="page learning-page">
      <header className="learning-header">
        <div>
          <p className="eyebrow">Today · {preferences.sessionMinutes} minutes</p>
          <h1>Practise for real life</h1>
        </div>
        <Link className="button secondary" href="/settings">{preferences.learningMode === "speaking_and_reading" ? "Speak + read" : "Speaking"}</Link>
      </header>
      <div className="stat-row">
        <span className="pill">{completed} concepts started</span>
        <span className="pill">prompt first</span>
        <span className="pill">progress stored locally</span>
        {preferences.referenceDeck !== "core_only" ? (
          <span className="pill">
            {preferences.referenceDeck === "ai_drafts_only" ? "AI reference deck" : "AI reference deck included"}
          </span>
        ) : null}
      </div>
      <ConceptPractice
        key={`${current.id}-${corrective ? "corrective" : "scheduled"}`}
        concept={current}
        preferences={preferences}
        position={index + 1}
        total={session.length + relearningIds.length}
        corrective={corrective}
        onComplete={complete}
      />
    </div>
  );
}
