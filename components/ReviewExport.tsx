"use client";

import { useState, useSyncExternalStore } from "react";
import { getLibrarySnapshot, parseLibrarySnapshot, subscribeLibrary } from "@/lib/libraryStore";
import { createReviewBundle, createReviewRecord, validateReviewBundle } from "@/lib/reviewPublishing";
import type { PhraseItem } from "@/lib/types";

const checkLabels = {
  meaning: "I checked the meaning of every phrase in this export",
  script: "I checked the Kannada script of every phrase",
  romanization: "I checked the romanization of every phrase",
  context: "I checked usage, context, and register of every phrase"
};

export function ReviewExport({ phrases, sources }: { phrases: PhraseItem[]; sources: PhraseItem[] }) {
  const snapshot = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot, () => null);
  const overrides = parseLibrarySnapshot(snapshot);
  const candidates = phrases.filter((phrase) => phrase.status === "approved" && overrides[phrase.id]?.status === "approved");
  return <ReviewExportForm key={JSON.stringify(candidates)} candidates={candidates} sources={sources} />;
}

function ReviewExportForm({ candidates, sources }: { candidates: PhraseItem[]; sources: PhraseItem[] }) {
  const [reviewer, setReviewer] = useState("");
  const [checks, setChecks] = useState({ meaning: false, script: false, romanization: false, context: false });
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const exportReviews = () => {
    try {
      if (!checks.meaning || !checks.script || !checks.romanization || !checks.context) throw new Error("Complete all four review checks before exporting.");
      if (!candidates.length) throw new Error("Approve at least one phrase before exporting.");
      const now = new Date().toISOString();
      const originalById = new Map(sources.map((phrase) => [phrase.id, phrase]));
      const records = candidates.map((phrase) => {
        const source = originalById.get(phrase.id);
        if (!source) throw new Error(`Original source is unavailable for ${phrase.id}.`);
        return createReviewRecord(source, phrase, reviewer, now, { meaning: true, script: true, romanization: true, context: true });
      });
      const bundle = validateReviewBundle(createReviewBundle(records, now), sources);
      const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `kannada-reviewed-phrases-${now.slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFailed(false); setMessage(`Exported ${records.length} reviewed ${records.length === 1 ? "phrase" : "phrases"}. The live site changes after validation and redeployment.`);
      setChecks({ meaning: false, script: false, romanization: false, context: false });
    } catch (error) {
      setFailed(true); setMessage(error instanceof Error ? error.message : "Could not export reviews.");
    }
  };
  return <section className="panel" aria-labelledby="review-export-title">
    <h2 id="review-export-title">Publish reviewed phrases</h2>
    <p className="small muted">Approve and edit phrases below, then export your reviewed changes. Approval stays in this browser until the export is validated, added to the project, and redeployed.</p>
    <p>{candidates.length} locally approved {candidates.length === 1 ? "phrase" : "phrases"} selected for export.</p>
    {candidates.length > 0 ? <details><summary>Check the phrases in this export</summary><ul>{candidates.map((phrase) => <li key={phrase.id}>{phrase.english} <span lang="kn" className="kannada-font">{phrase.kannadaScript}</span></li>)}</ul></details> : null}
    <form className="grid" onSubmit={(event) => { event.preventDefault(); exportReviews(); }}>
      <label htmlFor="publication-reviewer">Reviewer name</label>
      <p className="small muted">Use a public display name. It will be published with your reviewed phrases.</p>
      <input id="publication-reviewer" className="field" value={reviewer} maxLength={120} required onChange={(event) => setReviewer(event.target.value)} autoComplete="off" />
      <fieldset className="grid">
        <legend>Confirm your review of the selected phrases</legend>
        {(Object.keys(checkLabels) as Array<keyof typeof checkLabels>).map((key) => <label key={key} className="candidate-toggle"><input type="checkbox" checked={checks[key]} onChange={(event) => setChecks({ ...checks, [key]: event.target.checked })} />{checkLabels[key]}</label>)}
      </fieldset>
      <p className="small muted">This records an admin review. It does not claim native-speaker review or approve audio.</p>
      <button className="button" type="submit" disabled={!candidates.length || !reviewer.trim() || !Object.values(checks).every(Boolean)}>Export approved reviews</button>
    </form>
    {message ? <p className="small" role={failed ? "alert" : "status"}>{message}</p> : null}
    <details><summary>Apply the export to the shared catalog</summary>
      <p className="small">In the project folder, validate the downloaded file, then apply it:</p>
      <pre className="small">pnpm reviews:check --input /path/to/reviews.json{"\n"}pnpm reviews:apply --input /path/to/reviews.json</pre>
      <p className="small">Review the content diff, run the project checks, commit with fakecoder28, and deploy. The updated phrases will then be available to everyone. Learning progress stays on each device.</p>
    </details>
  </section>;
}
