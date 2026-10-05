"use client";

import { useRef, useState } from "react";
import { adminLibraryPhrases, sourceAdminLibraryPhrases } from "@/data/library-reference";
import { ReviewExport } from "@/components/ReviewExport";
import { AdminPhraseCard } from "@/components/AdminPhraseCard";
import { useLibraryPhrases } from "@/lib/useLibraryPhrases";
import { searchPhrases } from "@/lib/search";

const filters = [
  { id: "priority_human_review", label: "priority queue" },
  { id: "standard_human_review", label: "standard queue" },
  { id: "automated_reference", label: "automated reference" },
  { id: "human_review_required", label: "held" },
  { id: "ai_draft_caution", label: "AI caution" },
  { id: "approved", label: "approved" },
  { id: "needs_edit", label: "needs edit" },
  { id: "rejected", label: "rejected" },
  { id: "all", label: "all" }
];

export default function AdminPage() {
  const [filter, setFilter] = useState("priority_human_review");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const phrases = useLibraryPhrases(adminLibraryPhrases);
  const resultStatus = useRef<HTMLParagraphElement>(null);
  const [decision, setDecision] = useState("");
  const isPending = (phrase: (typeof phrases)[number]) => !["approved", "rejected", "needs_edit"].includes(phrase.status);
  const matchesFilter = (phrase: (typeof phrases)[number], selected: string) => {
    if (selected === "all") return true;
    if (selected.endsWith("_review") || selected === "automated_reference") return isPending(phrase) && phrase.automation?.reviewQueue === selected;
    return phrase.status === selected;
  };
  const results = searchPhrases(phrases.filter((phrase) => matchesFilter(phrase, filter)), query);
  const visible = results.slice(0, visibleCount);
  const counts = Object.fromEntries(filters.map(({ id }) => [id, phrases.filter((phrase) => matchesFilter(phrase, id)).length]));


  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Admin</p>
        <h1>Review reference drafts</h1>
        <p className="lede">
          Compare each draft with its source, correct the wording, and record your decision. Approved local reviews can be exported for validation and publication. An admin review does not claim native-speaker review or approve audio.
        </p>
      </section>
      <section className="panel">
        <div className="stat-row">
          <span className="pill">{counts.priority_human_review} pending priority reviews</span>
          <span className="pill">{counts.human_review_required} held for review</span>
          <span className="pill">{counts.approved} approved records</span>
        </div>
      </section>
      <details className="review-export-disclosure">
        <summary>Export and publish approved reviews</summary>
        <ReviewExport phrases={phrases} sources={sourceAdminLibraryPhrases} />
      </details>
      <section className="panel">
        <label className="small" htmlFor="admin-search">Search review queues</label>
        <input
          id="admin-search"
          className="search-input"
          type="search"
          placeholder="Search source or draft wording…"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setVisibleCount(50); }}
        />
        <p className="small muted">Pending queues group undecided drafts by review priority. Decision filters show approved, held, rejected, or edited records. One view is active at a time.</p>
        {[{ title: "Pending review queues", items: filters.slice(0, 3) }, { title: "Review decisions", items: filters.slice(3) }].map((group) => <div key={group.title} className="grid">
          <h2>{group.title}</h2>
          <div className="filter-row" role="group" aria-label={group.title}>
            {group.items.map((item) => <button key={item.id} className={filter === item.id ? "button" : "button secondary"} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setVisibleCount(50); }}>{item.label} ({counts[item.id]})</button>)}
          </div>
        </div>)}
      </section>
      <p ref={resultStatus} tabIndex={-1} className="small muted" role="status">{decision ? `${decision} ` : ""}Showing {visible.length} of {results.length} matching review items</p>
      <section className="grid">
        {visible.length === 0 ? <p className="panel muted">No phrases match this review view. Choose another view or clear your search.</p> : null}
        {visible.map((phrase) => (
          <AdminPhraseCard key={phrase.id} phrase={phrase} onDecision={(item, status) => {
            setDecision(`${item.english}: ${status === "approved" ? "approved locally for export" : status.replaceAll("_", " ")}.`);
            resultStatus.current?.focus();
          }} />
        ))}
      </section>
      {visible.length < results.length ? (
        <button className="button secondary" type="button" onClick={() => setVisibleCount((count) => count + 50)}>
          Show 50 more
        </button>
      ) : null}
    </div>
  );
}
