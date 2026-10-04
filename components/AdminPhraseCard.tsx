"use client";

import { useState } from "react";
import type { PhraseItem, PhraseStatus } from "@/lib/types";
import { setPhraseStatus, updatePhraseOverride } from "@/lib/libraryStore";
import { AudioButton } from "@/components/AudioButton";

export function AdminPhraseCard({ phrase }: { phrase: PhraseItem }) {
  const [draft, setDraft] = useState(phrase);
  const [editing, setEditing] = useState(false);
  const automation = phrase.automation;

  const setStatus = (status: PhraseStatus) => {
    setPhraseStatus(phrase.id, status);
  };

  const save = () => {
    updatePhraseOverride(phrase.id, {
      english: draft.english,
      kannadaRoman: draft.kannadaRoman,
      kannadaScript: draft.kannadaScript,
      usageNote: draft.usageNote,
      tags: draft.tags,
      category: draft.category,
      isBengaluruPractical: draft.isBengaluruPractical,
      status: draft.status
    });
    setEditing(false);
  };

  return (
    <article className="phrase-card">
      {editing ? (
        <div className="grid">
          <input aria-label="English meaning" className="field" value={draft.english} onChange={(event) => setDraft({ ...draft, english: event.target.value })} />
          <input aria-label="Romanized Kannada" className="field" value={draft.kannadaRoman} onChange={(event) => setDraft({ ...draft, kannadaRoman: event.target.value })} />
          <input aria-label="Kannada script" className="field" value={draft.kannadaScript ?? ""} onChange={(event) => setDraft({ ...draft, kannadaScript: event.target.value })} />
          <input aria-label="Category" className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          <textarea
            className="textarea"
            aria-label="Usage note"
            value={draft.usageNote ?? ""}
            onChange={(event) => setDraft({ ...draft, usageNote: event.target.value })}
          />
          <label className="small">
            <input
              type="checkbox"
              checked={draft.isBengaluruPractical}
              onChange={(event) => setDraft({ ...draft, isBengaluruPractical: event.target.checked })}
            />{" "}
            Bengaluru practical
          </label>
          <div className="action-row">
            <button className="button" type="button" onClick={save}>
              Save
            </button>
            <button className="button secondary" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="phrase-main">
            <p className="english">{phrase.english}</p>
            <p className="roman">{phrase.kannadaRoman}</p>
            <p className="script">{phrase.kannadaScript}</p>
          </div>
          <div className="meta-row">
            <span className="pill">{phrase.source}</span>
            <span className={phrase.status === "ai_draft_caution" || phrase.status === "human_review_required" ? "pill status-warning" : "pill"}>
              {phrase.status.replaceAll("_", " ")}
            </span>
            <span className="pill">{phrase.isBengaluruPractical ? "Bengaluru practical" : "candidate"}</span>
            {automation ? <span className="pill">{automation.reviewQueue.replaceAll("_", " ")}</span> : null}
            {automation ? <span className="pill">{automation.risk} risk · {Math.round(automation.draftConfidence * 100)}% draft confidence</span> : null}
            <AudioButton script={phrase.kannadaScript} roman={phrase.kannadaRoman} />
          </div>
          {automation ? (
            <details className="source-comparison">
              <summary>Compare immutable source with automated draft</summary>
              <div className="comparison-grid">
                <section>
                  <p className="eyebrow">Wikivoyage source</p>
                  <p><strong>{automation.sourcePhrase.english}</strong></p>
                  <p className="roman">{automation.sourcePhrase.kannadaRoman}</p>
                  <p className="script kannada-font" lang="kn">{automation.sourcePhrase.kannadaScript}</p>
                </section>
                <section>
                  <p className="eyebrow">Automated draft</p>
                  <p><strong>{phrase.english}</strong></p>
                  <p className="roman">{phrase.kannadaRoman}</p>
                  <p className="script kannada-font" lang="kn">{phrase.kannadaScript}</p>
                </section>
              </div>
              <p className="small muted">
                Draft ID {automation.draftId} · {automation.register} register · naturalness:{" "}
                {automation.bengaluruNaturalness.replaceAll("_", " ")}
              </p>
              {automation.issues.length ? (
                <div className="meta-row">
                  {automation.issues.map((issue) => <span className="pill status-warning" key={issue}>{issue.replaceAll("_", " ")}</span>)}
                </div>
              ) : <p className="small muted">No deterministic structural issue detected.</p>}
              <p className="draft-warning small">
                Automated reference only. It has not been reviewed by a human or native speaker and is not course/audio material.
              </p>
            </details>
          ) : null}
          <div className="action-row">
            <button className="button" type="button" onClick={() => setStatus("approved")}>
              Approve locally for Library
            </button>
            <button className="button secondary" type="button" onClick={() => { setDraft(phrase); setEditing(true); }}>
              Edit
            </button>
            <button className="button secondary" type="button" onClick={() => setStatus("needs_edit")}>
              Needs edit
            </button>
            <button className="button warning" type="button" onClick={() => setStatus("rejected")}>
              Reject
            </button>
          </div>
        </>
      )}
    </article>
  );
}
