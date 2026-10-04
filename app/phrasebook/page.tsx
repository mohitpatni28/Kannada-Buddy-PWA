"use client";

import { useState } from "react";
import { AudioButton } from "@/components/AudioButton";
import { learningConcepts, missionOrder } from "@/data/learning-concepts";

export default function PhrasebookPage() {
  const [query, setQuery] = useState("");
  const [mission, setMission] = useState("all");
  const missions = missionOrder.map((id) => ({
    id,
    title: learningConcepts.find((concept) => concept.missionId === id)?.missionTitle ?? id
  }));

  const needle = query.trim().toLocaleLowerCase();
  const results = learningConcepts.filter((concept) => {
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
        <p className="lede">Only the compact course set appears here. Search by situation, English meaning, romanization, or Kannada script. Linguistic review status is shown per phrase.</p>
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
          <button className={mission === "all" ? "button" : "button secondary"} type="button" onClick={() => setMission("all")}>All</button>
          {missions.map((item) => (
            <button key={item.id} className={mission === item.id ? "button" : "button secondary"} type="button" onClick={() => setMission(item.id)}>{item.title}</button>
          ))}
        </div>
      </section>
      <p className="small muted" role="status">{results.length} course {results.length === 1 ? "phrase" : "phrases"}</p>
      <section className="grid" aria-label="Phrase results">
        {results.map((concept) => (
          <article className="phrase-card" key={concept.id}>
            <div className="meta-row">
              <span className="pill">{concept.missionTitle}</span>
              <span className="pill">{concept.form.register} register</span>
              <span className={concept.form.review.status === "reviewed" ? "pill" : "pill status-warning"}>
                {concept.form.review.status === "reviewed" ? "native reviewed" : "native review pending"}
              </span>
            </div>
            <div className="phrase-main">
              <strong className="english">{concept.intent}</strong>
              <span className="roman">{concept.form.kannadaRoman}</span>
              <span className="script kannada-font" lang="kn">{concept.form.kannadaScript}</span>
            </div>
            <p className="small muted">{concept.situation}</p>
            <AudioButton script={concept.form.kannadaScript} roman={concept.form.kannadaRoman} audioUrl={concept.audioUrl} label={`Play ${concept.intent} in Kannada`} />
            {concept.usageNote ? <p className="small"><strong>Use:</strong> {concept.usageNote}</p> : null}
            {concept.pattern ? <p className="small"><strong>Pattern:</strong> {concept.pattern}</p> : null}
          </article>
        ))}
        {results.length === 0 ? <p className="panel muted">No matching course phrase. Try a shorter search or another situation.</p> : null}
      </section>
    </div>
  );
}
