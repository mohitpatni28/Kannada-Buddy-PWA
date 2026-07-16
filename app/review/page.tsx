"use client";

import { useEffect, useMemo, useState } from "react";
import { allPhrases } from "@/data/all-phrases";
import { PhraseCard } from "@/components/PhraseCard";
import { ReviewButtons } from "@/components/ReviewButtons";
import { loadProgress } from "@/lib/progress";
import { isDue } from "@/lib/spacedRepetition";
import { mergeOverrides } from "@/lib/libraryStore";
import type { PhraseItem, ReviewProgress } from "@/lib/types";

export default function ReviewPage() {
  const [progress, setProgress] = useState<Record<string, ReviewProgress>>({});
  const [phrases, setPhrases] = useState<PhraseItem[]>(allPhrases);

  useEffect(() => {
    setProgress(loadProgress());
    setPhrases(mergeOverrides(allPhrases));
  }, []);

  const due = useMemo(
    () => phrases.filter((phrase) => phrase.status === "approved").filter((phrase) => isDue(progress[phrase.id])).slice(0, 12),
    [phrases, progress]
  );

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Review</p>
        <h1>Keep it warm</h1>
        <p className="lede">Rate confidence after each phrase. Forgot returns tomorrow, recognized in three days, and can say in seven.</p>
      </section>
      <section className="grid">
        {due.map((phrase) => (
          <div className="grid" key={phrase.id}>
            <PhraseCard phrase={phrase} />
            <div className="panel">
              <ReviewButtons phraseId={phrase.id} onRated={() => setProgress(loadProgress())} />
            </div>
          </div>
        ))}
        {due.length === 0 ? <p className="panel">You are clear for now. New reviews will appear as phrases become due.</p> : null}
      </section>
    </div>
  );
}
