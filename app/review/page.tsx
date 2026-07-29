"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { learningConcepts } from "@/data/learning-concepts";
import { orthographyUnits } from "@/data/orthography-units";
import { eligibleReferenceLearningConcepts } from "@/data/reference-learning-concepts";
import { loadLearningState } from "@/lib/learningStore";
import type { LearningState } from "@/lib/types";

export default function ProgressPage() {
  const [state, setState] = useState<LearningState>({ concepts: {}, orthography: {}, evidence: [] });
  useEffect(() => setState(loadLearningState()), []);

  const stats = useMemo(() => {
    const progress = Object.values(state.concepts);
    const now = Date.now();
    return {
      started: progress.length,
      strong: progress.filter((item) => item.stabilityDays >= 7).length,
      due: progress.filter((item) => new Date(item.nextReviewAt).getTime() <= now).length
        + Object.values(state.orthography).filter((item) => new Date(item.nextReviewAt).getTime() <= now).length,
      scriptUnits: Object.keys(state.orthography).length
    };
  }, [state]);

  const allConcepts = [...learningConcepts, ...eligibleReferenceLearningConcepts];
  const startedConcepts = allConcepts.filter((concept) => state.concepts[concept.id]);

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Learning progress</p>
        <h1>What you can use</h1>
        <p className="lede">Progress reflects successful attempts and durable review intervals—not cards viewed or time spent.</p>
      </section>
      <section className="progress-stats">
        <article className="stat-card"><strong>{stats.started}</strong><span>concepts started</span></article>
        <article className="stat-card"><strong>{stats.strong}</strong><span>stable for 7+ days</span></article>
        <article className="stat-card"><strong>{stats.due}</strong><span>due now</span></article>
        <article className="stat-card"><strong>{stats.scriptUnits}</strong><span>script units started</span></article>
      </section>
      {Object.keys(state.orthography).length ? (
        <section className="grid">
          <h2>Kannada script pathway</h2>
          {orthographyUnits.filter((unit) => state.orthography[unit.id]).map((unit) => {
            const progress = state.orthography[unit.id];
            return (
              <article className="panel concept-history" key={unit.id}>
                <div>
                  <h3>{unit.title}</h3>
                  <p className="kannada-font script" lang="kn">{unit.symbols.map((item) => item.grapheme).join(" · ")}</p>
                </div>
                <div className="meta-row">
                  <span className="pill">{progress.attempts} checks</span>
                  <span className="pill">{Math.round(progress.stabilityDays)} day stability</span>
                  <span className="pill">due {new Date(progress.nextReviewAt).toLocaleDateString()}</span>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
      <Link className="button" href="/">Start today’s adaptive session</Link>
      <section className="grid">
        <h2>Concept history</h2>
        {startedConcepts.map((concept) => {
          const progress = state.concepts[concept.id];
          return (
            <article className="panel concept-history" key={concept.id}>
              <div>
                <h3>{concept.intent}</h3>
                <p className="kannada-font script" lang="kn">{concept.form.kannadaScript}</p>
              </div>
              <div className="meta-row">
                <span className="pill">{progress.attempts} attempts</span>
                <span className="pill">{Math.round(progress.stabilityDays)} day stability</span>
                <span className="pill">due {new Date(progress.nextReviewAt).toLocaleDateString()}</span>
                <span className={concept.form.review.status === "reviewed" ? "pill" : "pill status-warning"}>
                  {concept.form.review.status === "reviewed"
                    ? "native reviewed"
                    : concept.form.review.source === "automated_reference_draft"
                      ? concept.contentTier === "ai_draft_caution" ? "AI caution draft" : "AI reference draft"
                      : "review pending"}
                </span>
              </div>
            </article>
          );
        })}
        {startedConcepts.length === 0 ? <p className="panel muted">Complete your first lesson to begin building a learning history.</p> : null}
      </section>
    </div>
  );
}
