"use client";

import { useState } from "react";
import audioPack from "@/data/audio-pack.json";
import { cautionReferenceLearningConcepts, safeReferenceLearningConcepts } from "@/data/reference-learning-concepts";
import { defaultSpeakingPreferences, savePreferences } from "@/lib/preferences";
import { usePreferences } from "@/lib/usePreferences";
import type { LearningMode, LearningPreferences, ReferenceDeckPreference, RomanizationPreference } from "@/lib/types";

export default function SettingsPage() {
  const packagedAudioCount = Object.keys(audioPack).length;
  const preferences = usePreferences() ?? defaultSpeakingPreferences;
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<LearningPreferences>) => {
    const next = { ...preferences, ...patch };
    savePreferences(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Settings</p>
        <h1>Make it your course</h1>
        <p className="lede">Change how Kannada script and romanization appear. Your speaking progress is preserved when you switch modes.</p>
      </section>

      <section className="panel settings-section">
        <div>
          <h2>Learning mode</h2>
          <p className="small muted">Reading adds a separately scheduled pathway through letters, vowel signs, virama, clusters, and phrase decoding.</p>
        </div>
        <div className="segmented" role="group" aria-label="Learning mode">
          {([
            ["speaking", "Speak Kannada"],
            ["speaking_and_reading", "Speak + read"]
          ] as [LearningMode, string][]).map(([value, label]) => (
            <button key={value} className={preferences.learningMode === value ? "button" : "button secondary"} aria-pressed={preferences.learningMode === value} type="button" onClick={() => update({ learningMode: value })}>{label}</button>
          ))}
        </div>
      </section>

      <section className="panel settings-section">
        <div>
          <h2>Learning content</h2>
          <p className="small muted">
            Add source-linked AI drafts to the same spaced-repetition schedule as the core course. Progress stays
            on this device. Draft labels remain visible while practising.
          </p>
        </div>
        <select
          className="select"
          value={preferences.referenceDeck}
          onChange={(event) => update({ referenceDeck: event.target.value as ReferenceDeckPreference })}
        >
          <option value="safe_ai_drafts">Core + {safeReferenceLearningConcepts.length} regular AI drafts</option>
          <option value="all_eligible_ai_drafts">
            Core + all eligible drafts ({safeReferenceLearningConcepts.length + cautionReferenceLearningConcepts.length}, including {cautionReferenceLearningConcepts.length} caution)
          </option>
          <option value="ai_drafts_only">Regular AI drafts only ({safeReferenceLearningConcepts.length})</option>
          <option value="core_only">Core course only</option>
        </select>
        <p className="small muted">
          Structurally held phrases never enter learning sessions. AI drafts have no approved audio and do not claim
          human or native review.
        </p>
      </section>

      <section className="panel settings-section">
        <div>
          <h2>Romanization</h2>
          <p className="small muted">In reading mode, “when needed” lets you attempt Kannada script before showing help.</p>
        </div>
        <select className="select" value={preferences.romanization} onChange={(event) => update({ romanization: event.target.value as RomanizationPreference })}>
          <option value="always">Always show</option>
          <option value="when_needed">Show when needed</option>
          <option value="hidden">Hide by default</option>
        </select>
      </section>

      <section className="panel settings-section">
        <div>
          <h2>Session length</h2>
          <p className="small muted">Longer sessions include more due and new concepts.</p>
        </div>
        <div className="segmented" role="group" aria-label="Session length">
          {([5, 10, 15] as const).map((minutes) => (
            <button key={minutes} className={preferences.sessionMinutes === minutes ? "button" : "button secondary"} aria-pressed={preferences.sessionMinutes === minutes} type="button" onClick={() => update({ sessionMinutes: minutes })}>{minutes} min</button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Offline audio</h2>
        <p className="muted">Lessons prefer packaged Kannada audio only after each synthetic clip passes listening and linguistic review. {packagedAudioCount === 0 ? "No clip is currently approved, so playback is optional device-generated exposure—not a pronunciation authority." : `${packagedAudioCount} reviewed ${packagedAudioCount === 1 ? "clip is" : "clips are"} packaged for offline playback.`}</p>
        <span className={packagedAudioCount ? "pill" : "pill status-warning"}>{packagedAudioCount ? `${packagedAudioCount} reviewed clips installed` : "Audio pack not installed"}</span>
      </section>
      {saved ? <p className="small muted" role="status">Settings saved on this device.</p> : null}
    </div>
  );
}
