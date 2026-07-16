import type { PhraseItem } from "@/lib/types";
import { AudioButton } from "@/components/AudioButton";

export function PhraseCard({ phrase, compact = false }: { phrase: PhraseItem; compact?: boolean }) {
  return (
    <article className="phrase-card">
      <div className="phrase-main">
        <p className="english">{phrase.english}</p>
        <p className="roman">{phrase.kannadaRoman}</p>
        {phrase.kannadaScript ? <p className="script">{phrase.kannadaScript}</p> : null}
      </div>
      {!compact && phrase.usageNote ? <p className="small muted">{phrase.usageNote}</p> : null}
      <div className="meta-row">
        <span className="pill">{phrase.category}</span>
        {phrase.status !== "approved" ? <span className="pill status-warning">Unreviewed</span> : null}
        {phrase.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="pill">
            {tag}
          </span>
        ))}
        <AudioButton script={phrase.kannadaScript} roman={phrase.kannadaRoman} />
      </div>
    </article>
  );
}
