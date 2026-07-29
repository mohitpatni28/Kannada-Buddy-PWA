"use client";

import { useEffect, useMemo, useState } from "react";
import { adminLibraryPhrases, libraryDraftCounts } from "@/data/library-reference";
import { AdminPhraseCard } from "@/components/AdminPhraseCard";
import { mergeOverrides } from "@/lib/libraryStore";
import { searchPhrases } from "@/lib/search";

const filters = [
  { id: "priority_human_review", label: "priority queue" },
  { id: "standard_human_review", label: "standard queue" },
  { id: "automated_reference", label: "automated reference" },
  { id: "human_review_required", label: "held" },
  { id: "ai_draft_caution", label: "AI caution" },
  { id: "approved", label: "approved" },
  { id: "all", label: "all" }
];

export default function AdminPage() {
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState("priority_human_review");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const phrases = useMemo(() => mergeOverrides(adminLibraryPhrases), [version]);
  const filtered = phrases.filter((phrase) => {
    if (filter === "all") return true;
    if (filter.endsWith("_review") || filter === "automated_reference") {
      return phrase.automation?.reviewQueue === filter;
    }
    return phrase.status === filter;
  });
  const results = searchPhrases(filtered, query);
  const visible = results.slice(0, visibleCount);
  const counts = Object.fromEntries(filters.map(({ id }) => [
    id,
    id === "all"
      ? phrases.length
      : id.endsWith("_review") || id === "automated_reference"
        ? phrases.filter((phrase) => phrase.automation?.reviewQueue === id).length
        : phrases.filter((phrase) => phrase.status === id).length
  ]));

  useEffect(() => {
    setVisibleCount(50);
  }, [filter, query]);

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Admin</p>
        <h1>Review reference drafts</h1>
        <p className="lede">
          Compare immutable source rows with automated drafts, then triage by risk. Local actions never add an item
          to the production course or claim native-speaker review.
        </p>
      </section>
      <section className="panel">
        <div className="stat-row">
          <span className="pill">{libraryDraftCounts.priority} priority reviews</span>
          <span className="pill">{libraryDraftCounts.held} held from Library</span>
          <span className="pill">{libraryDraftCounts.caution} caution references</span>
        </div>
      </section>
      <section className="panel">
        <label className="small" htmlFor="admin-search">Search review queues</label>
        <input
          id="admin-search"
          className="search-input"
          type="search"
          placeholder="Search source or draft wording…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="filter-row">
          {filters.map((item) => (
            <button key={item.id} className={filter === item.id ? "button" : "button secondary"} type="button" onClick={() => setFilter(item.id)}>
              {item.label} ({counts[item.id]})
            </button>
          ))}
        </div>
      </section>
      <p className="small muted" role="status">Showing {visible.length} of {results.length} matching review items</p>
      <section className="grid">
        {visible.map((phrase) => (
          <AdminPhraseCard key={phrase.id} phrase={phrase} onChange={() => setVersion((value) => value + 1)} />
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
