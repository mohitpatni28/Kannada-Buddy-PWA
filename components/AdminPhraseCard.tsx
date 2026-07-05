"use client";

import { useState } from "react";
import type { PhraseItem, PhraseStatus } from "@/lib/types";
import { setPhraseStatus, updatePhraseOverride } from "@/lib/libraryStore";
import { AudioButton } from "@/components/AudioButton";

export function AdminPhraseCard({ phrase, onChange }: { phrase: PhraseItem; onChange: () => void }) {
  const [draft, setDraft] = useState(phrase);
  const [editing, setEditing] = useState(false);

  const setStatus = (status: PhraseStatus) => {
    setPhraseStatus(phrase.id, status);
    onChange();
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
    onChange();
  };

  return (
    <article className="phrase-card">
      {editing ? (
        <div className="grid">
          <input className="field" value={draft.english} onChange={(event) => setDraft({ ...draft, english: event.target.value })} />
          <input className="field" value={draft.kannadaRoman} onChange={(event) => setDraft({ ...draft, kannadaRoman: event.target.value })} />
          <input className="field" value={draft.kannadaScript ?? ""} onChange={(event) => setDraft({ ...draft, kannadaScript: event.target.value })} />
          <input className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          <textarea
            className="textarea"
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
            <span className="pill">{phrase.status.replace("_", " ")}</span>
            <span className="pill">{phrase.isBengaluruPractical ? "Bengaluru practical" : "candidate"}</span>
            <AudioButton script={phrase.kannadaScript} roman={phrase.kannadaRoman} />
          </div>
          <div className="action-row">
            <button className="button" type="button" onClick={() => setStatus("approved")}>
              Approve
            </button>
            <button className="button secondary" type="button" onClick={() => setEditing(true)}>
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
