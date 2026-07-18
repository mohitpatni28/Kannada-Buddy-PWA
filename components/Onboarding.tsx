"use client";

import type { LearningPreferences } from "@/lib/types";
import { defaultReadingPreferences, defaultSpeakingPreferences } from "@/lib/preferences";

export function Onboarding({ onChoose }: { onChoose: (preferences: LearningPreferences) => void }) {
  return (
    <div className="onboarding page">
      <section className="hero onboarding-hero">
        <p className="eyebrow">Bengaluru survival Kannada</p>
        <h1>How do you want to learn?</h1>
        <p className="lede">Both paths build practical speaking through active recall. Add a structured Kannada alphabet and decoding pathway now, or turn it on later without losing progress.</p>
      </section>
      <section className="mode-grid" aria-label="Choose a learning mode">
        <button className="mode-card" type="button" onClick={() => onChoose(defaultSpeakingPreferences)}>
          <span className="mode-mark" aria-hidden="true">Aa</span>
          <span>
            <strong>Speak Kannada</strong>
            <small>Prompt-first speaking lessons with clear romanization and everyday Bengaluru phrases.</small>
          </span>
          <span className="mode-action">Choose speaking →</span>
        </button>
        <button className="mode-card featured" type="button" onClick={() => onChoose(defaultReadingPreferences)}>
          <span className="mode-mark kannada-font" aria-hidden="true">ಕ</span>
          <span>
            <strong>Speak + read Kannada</strong>
            <small>The same speaking course, plus sequenced letters, vowel signs, clusters, and phrase decoding.</small>
          </span>
          <span className="mode-action">Choose speaking + reading →</span>
        </button>
      </section>
      <p className="small muted">Your learning data stays on this device. You can change mode anytime in Settings.</p>
    </div>
  );
}
