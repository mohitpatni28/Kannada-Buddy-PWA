import type { PhraseItem } from "@/lib/types";
import { AudioButton } from "@/components/AudioButton";

export function PhraseCard({ phrase, compact = false }: { phrase: PhraseItem; compact?: boolean }) {
  const automated = phrase.automation;
  const statusLabel = phrase.publicationReview && phrase.status === "approved"
    ? "Published admin review"
    : phrase.status === "ai_draft"
    ? "AI reference draft"
    : phrase.status === "ai_draft_caution"
      ? "AI draft · use caution"
      : phrase.status === "approved" && automated
        ? "Locally approved · AI source"
        : phrase.status === "approved" ? "Reviewed library phrase" : phrase.status.replaceAll("_", " ");

  return (
    <article className={phrase.status === "ai_draft_caution" ? "phrase-card draft-caution" : "phrase-card"}>
      <div className="phrase-main">
        <p className="english">{phrase.english}</p>
        <p className="roman">{phrase.kannadaRoman}</p>
        {phrase.kannadaScript ? <p className="script kannada-font" lang="kn">{phrase.kannadaScript}</p> : null}
      </div>
      {!compact && phrase.usageNote ? <p className="small muted">{phrase.usageNote}</p> : null}
      {phrase.status === "ai_draft_caution" ? (
        <p className="draft-warning small">
          Automated high-stakes reference. Verify with a person before relying on it.
        </p>
      ) : null}
      <div className="meta-row">
        <span className="pill">{phrase.category}</span>
        <span className={phrase.status === "approved" ? "pill" : "pill status-warning"}>{statusLabel}</span>
        {automated ? <span className="pill">{automated.register} register</span> : null}
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
