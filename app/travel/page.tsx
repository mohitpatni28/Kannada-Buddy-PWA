import Link from "next/link";
import { courseScenarios } from "@/data/course-catalog";

export default function TravelPage() {
  return <div className="page">
    <header className="band">
      <p className="eyebrow">Practice</p>
      <h1>Prepare for your day</h1>
      <p className="lede">Recall what is due in your adaptive lesson, or look up phrases for a situation. Browsing does not change your learning progress.</p>
    </header>
    <section className="panel">
      <h2>Your adaptive lesson</h2>
      <p className="muted">A mix of due reviews and new phrases, using your learning settings.</p>
      <Link className="button" href="/today">Start today’s lesson</Link>
    </section>
    <section className="grid" aria-labelledby="practice-situations">
      <h2 id="practice-situations">Browse a situation</h2>
      <div className="dashboard-grid">
        {courseScenarios.map((scenario) => <Link className="quick-link" key={scenario.id} href={`/phrasebook?situation=${scenario.id}`}>
          <strong>{scenario.title}</strong><span>Find phrases for this situation →</span>
        </Link>)}
      </div>
    </section>
    <Link className="button secondary" href="/library">Explore the reference library</Link>
  </div>;
}
