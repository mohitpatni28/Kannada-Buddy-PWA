"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { AudioButton } from "@/components/AudioButton";
import { courseLearningConcepts, courseScenarios, courseSourcePhrases } from "@/data/course-catalog";

export default function PhrasebookPage() {
  const [query, setQuery] = useState("");
  const [chosenMission, setMission] = useState<string | null>(null);
  const search = useSyncExternalStore(subscribeLocation, () => window.location.search, () => "");
  const linkedSituation = new URLSearchParams(search).get("situation");
  const mission = chosenMission ?? (courseScenarios.some((item) => item.id === linkedSituation) ? linkedSituation : "all");
  const missions = courseScenarios;
  const nativeReviewed = courseLearningConcepts.filter((item) => item.form.review.source === "native_review").length;
  const adminReviewed = courseLearningConcepts.filter((item) => item.form.review.source === "admin_review").length;
  const drafts = courseLearningConcepts.length - nativeReviewed - adminReviewed;

  const needle = query.trim().toLocaleLowerCase();
  const results = courseLearningConcepts.filter((concept) => {
    if (mission !== "all" && concept.missionId !== mission) return false;
    if (!needle) return true;
    return [
      concept.intent,
      concept.situation,
      concept.form.kannadaRoman,
      concept.form.kannadaScript,
      concept.pattern,
      concept.usageNote
    ].some((value) => value?.toLocaleLowerCase().includes(needle));
  });

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Course phrasebook</p>
        <h1>Find a useful phrase</h1>
        <p className="lede">{courseLearningConcepts.length} everyday phrases across {missions.length} situations. Search English, romanization, or Kannada script.</p>
        <p className="small muted">{nativeReviewed} native reviewed{adminReviewed ? `, ${adminReviewed} admin reviewed` : ""}, {drafts} drafts awaiting review. Each phrase has one primary situation; its uses can overlap.</p>
        <Link className="text-link" href="/library">Need more? Search the broader reference library →</Link>
      </section>
      <section className="panel">
        <label className="small" htmlFor="phrase-search">Search the course</label>
        <input
          id="phrase-search"
          className="search-input"
          type="search"
          placeholder="Try water, auto, price, ನಮಸ್ಕಾರ…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="filter-row" aria-label="Situation filter">
          <button className={mission === "all" ? "button" : "button secondary"} type="button" aria-pressed={mission === "all"} onClick={() => setMission("all")}>All</button>
          {missions.map((item) => (
            <button key={item.id} className={mission === item.id ? "button" : "button secondary"} type="button" aria-pressed={mission === item.id} onClick={() => setMission(item.id)}>{item.title}</button>
          ))}
        </div>
      </section>
      <p className="small muted" role="status">{results.length} course {results.length === 1 ? "phrase" : "phrases"}</p>
      <section className="grid" aria-label="Phrase results">
        {results.map((concept) => {
          const source = courseSourcePhrases.get(concept.id);
          const adminReviewed = concept.form.review.source === "admin_review";
          const sourceName = source?.source === "wikivoyage" ? "Wikivoyage" : source?.source;
          return (
          <article className="phrase-card" key={concept.id}>
            <div className="meta-row">
              <span className="pill">{concept.missionTitle}</span>
              <span className="pill">{concept.form.register} register</span>
              <span className={concept.form.review.status === "reviewed" ? "pill" : "pill status-warning"}>
                {concept.form.review.source === "native_review" ? "native reviewed" : concept.form.review.source === "admin_review" ? "Admin reviewed" : "AI draft · native review pending"}
              </span>
            </div>
            <div className="phrase-main">
              <strong className="english">{concept.intent}</strong>
              <span className="roman">{concept.form.kannadaRoman}</span>
              <span className="script kannada-font" lang="kn">{concept.form.kannadaScript}</span>
            </div>
            <p className="small muted">{concept.situation}</p>
            <AudioButton script={concept.form.kannadaScript} roman={concept.form.kannadaRoman} audioUrl={concept.audioUrl} label={`Play ${concept.intent} in Kannada`} />
            {source ? (
              <p className="small muted">
                {adminReviewed ? "Reviewed adaptation" : "AI draft adapted"} from{" "}
                {source.sourceUrl ? <a href={source.sourceUrl}>{sourceName}</a> : <span>{sourceName}</span>}
                {source.license ? ` · ${source.license}. ` : ". "}
                {adminReviewed
                  ? `Admin review by ${concept.form.review.reviewer}; this is not a native-speaker review. `
                  : "Editorial selection is not linguistic approval. "}
                <a href="/sources">Attribution and changes</a>
              </p>
            ) : null}
            {concept.usageNote ? <p className="small"><strong>Use:</strong> {concept.usageNote}</p> : null}
            {concept.pattern ? <p className="small"><strong>Pattern:</strong> {concept.pattern}</p> : null}
          </article>
          );
        })}
        {results.length === 0 ? <p className="panel muted">No matching course phrase. Try a shorter search or another situation.</p> : null}
      </section>
    </div>
  );
}

function subscribeLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
