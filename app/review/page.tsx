"use client";

import Link from "next/link";
import { orthographyUnits } from "@/data/orthography-units";
import { activeLearningConcepts, isRetained, learningMetrics } from "@/lib/learningMetrics";
import { usePreferences } from "@/lib/usePreferences";
import { useLearningState } from "@/lib/useLearningState";
import { useCurrentTime } from "@/lib/useCurrentTime";

export default function ProgressPage() {
  const state = useLearningState();
  const now = useCurrentTime();

  const preferences = usePreferences();
  const allConcepts = activeLearningConcepts(preferences?.referenceDeck ?? "core_only");
  const stats = learningMetrics(allConcepts, state, now, preferences?.learningMode === "speaking_and_reading");
  const startedConcepts = allConcepts.filter((concept) => state.concepts[concept.id]);

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Learning progress</p>
        <h1>What you can use</h1>
        <p className="lede">Speaking is self-reported recall, not an automated pronunciation score. Retained means independent recall on two distinct scheduled review days, with the latest gap at least seven days, and no review overdue.</p>
      </section>
      <section className="progress-stats" aria-label="Active deck progress">
        <article className="stat-card"><strong>{stats.new}</strong><span>new</span></article>
        <article className="stat-card"><strong>{stats.learning}</strong><span>learning</span></article>
        <article className="stat-card"><strong>{stats.retained}</strong><span>retained speaking</span></article>
        <article className="stat-card"><strong>{stats.totalDue}</strong><span>due now</span></article>
      </section>
      <section className="panel">
        <h2>Your active decks</h2>
        <p>{stats.tiers.core} course concepts · {stats.tiers.ai} AI draft concepts. Due now includes {stats.due} phrases{stats.scriptDue ? ` and ${stats.scriptDue} script units` : ""}. Disabled decks keep their history and are excluded here.</p>
        <p>Lifetime: {stats.lifetime.speaking} speaking attempts · {stats.lifetime.reading} reading attempts · {stats.lifetime.script} script checks.</p>
        <p>Reading: {stats.readingStarted} concepts started · {stats.readingRetained} retained. Speaking and reading evidence are counted separately.</p>
        <p>Last seven days: {stats.recentTruncated ? "at least " : ""}{stats.recent.length} recorded checks. {stats.recentTruncated ? "Detailed history keeps the latest 500 checks; lifetime totals remain complete." : "Imported history is excluded because its dates cannot prove recent practice."}</p>
      </section>
      <section className="grid" aria-label="Progress by situation">
        <h2>By situation</h2>
        {stats.missions.map((mission) => <article className="panel" key={mission.title}><h3>{mission.title}</h3><p>{mission.started}/{mission.total} started · {mission.retained} retained · {mission.due} due</p></article>)}
      </section>
      <section className="panel">
        <h2>Upcoming reviews</h2>
        {stats.upcoming.length ? <ul>{stats.upcoming.map((item) => <li key={item.id}>{item.title} · {new Date(item.at).toLocaleDateString()}</li>)}</ul> : <p>No upcoming phrase reviews yet.</p>}
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
                  <span className="pill">{Math.max(0, Math.round((new Date(progress.nextReviewAt).getTime() - new Date(progress.lastSeenAt).getTime()) / 86400000))} day scheduled interval</span>
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
                <span className="pill">{progress.attempts} speaking attempts</span>
                <span className="pill">{progress.readingAttempts} reading attempts</span>
                <span className="pill">{isRetained(progress.speakingRecall, progress.nextReviewAt, now) ? "retained" : new Date(progress.nextReviewAt).getTime() <= now ? "needs review" : "learning"}</span>
                <span className="pill">{Math.max(0, Math.round((new Date(progress.nextReviewAt).getTime() - new Date(progress.lastSeenAt).getTime()) / 86400000))} day scheduled interval</span>
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
