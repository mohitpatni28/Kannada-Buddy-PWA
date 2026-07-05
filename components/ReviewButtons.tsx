"use client";

import { useState } from "react";
import { ratePhrase } from "@/lib/progress";

export function ReviewButtons({ phraseId, onRated }: { phraseId: string; onRated?: () => void }) {
  const [saved, setSaved] = useState<1 | 2 | 3 | null>(null);

  const rate = (confidence: 1 | 2 | 3) => {
    ratePhrase(phraseId, confidence);
    setSaved(confidence);
    onRated?.();
  };

  return (
    <div className="grid">
      <div className="action-row" role="group" aria-label="Rate confidence">
        <button className="button secondary" type="button" onClick={() => rate(1)}>
          Forgot
        </button>
        <button className="button secondary" type="button" onClick={() => rate(2)}>
          Recognized
        </button>
        <button className="button" type="button" onClick={() => rate(3)}>
          Can say
        </button>
      </div>
      {saved ? <p className="small muted">Saved. Next review scheduled from your confidence rating.</p> : null}
    </div>
  );
}
