import Link from "next/link";
import { allPhrases } from "@/data/all-phrases";
import { generateDailyLesson } from "@/lib/lessonGenerator";
import { PhraseCard } from "@/components/PhraseCard";
import { QuizCard } from "@/components/QuizCard";
import { ReviewButtons } from "@/components/ReviewButtons";

export default function HomePage() {
  const daily = generateDailyLesson({}, allPhrases);

  return (
    <div className="page">
      <section className="hero">
        <div className="grid">
          <p className="eyebrow">Bengaluru survival Kannada</p>
          <h1>Kannada Buddy</h1>
          <p className="lede">Five-minute lessons, commute drills, searchable phrases, and local confidence tracking for everyday Bengaluru situations.</p>
        </div>
        <div className="stat-row">
          <span className="pill">{daily.lesson.estimatedMinutes} min today</span>
          <span className="pill">{allPhrases.filter((phrase) => phrase.status === "approved").length} approved phrases</span>
          <span className="pill">{allPhrases.filter((phrase) => phrase.status === "raw_imported").length} import candidates</span>
          <span className="pill">offline shell ready</span>
        </div>
      </section>

      <section className="split">
        <div className="grid">
          <div className="panel">
            <div className="meta-row">
              <span className="pill">today</span>
              <span className="pill">{daily.lesson.scenario}</span>
            </div>
            <h2>{daily.lesson.title}</h2>
            <p className="muted">{daily.mission}</p>
          </div>

          <section className="band">
            <h2>New phrases</h2>
            <ul className="lesson-list">
              {daily.newItems.map((phrase) => (
                <li key={phrase.id}>
                  <PhraseCard phrase={phrase} />
                  <div className="panel" style={{ marginTop: 8 }}>
                    <ReviewButtons phraseId={phrase.id} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {daily.listeningQuiz ? <QuizCard phrase={daily.listeningQuiz} /> : null}
        </div>

        <aside className="grid">
          <Link className="quick-link" href="/travel">
            <strong>Commute drill</strong>
            <span>Audio-first English prompt, Kannada response, repeat, next.</span>
          </Link>
          <Link className="quick-link" href="/phrasebook">
            <strong>Find a phrase</strong>
            <span>Search UPI, less spicy, plumber, stop here, water, and more.</span>
          </Link>
          <Link className="quick-link" href="/admin">
            <strong>Curate library</strong>
            <span>Approve raw imports, edit phrases, test audio, and mark practical items.</span>
          </Link>
        </aside>
      </section>
    </div>
  );
}
