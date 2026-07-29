"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PhraseCard } from "@/components/PhraseCard";
import { libraryDraftCounts, libraryPhrases } from "@/data/library-reference";
import { mergeOverrides } from "@/lib/libraryStore";
import { categoriesFor, searchPhrases } from "@/lib/search";

export default function LibraryPage() {
  const [status, setStatus] = useState("reference");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(60);
  const phrases = useMemo(() => mergeOverrides(libraryPhrases), []);
  const statusFiltered = phrases.filter((phrase) => status === "reference" || phrase.status === status);
  const results = searchPhrases(statusFiltered, query, category);
  const visible = results.slice(0, visibleCount);
  const categories = categoriesFor(phrases);
  const counts = Object.fromEntries(
    ["reference", "approved", "ai_draft", "ai_draft_caution"].map((item) => [
      item,
      item === "reference" ? phrases.length : phrases.filter((phrase) => phrase.status === item).length
    ])
  );

  useEffect(() => {
    setVisibleCount(60);
  }, [category, query, status]);

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Reference library</p>
        <h1>Kannada for more situations</h1>
        <p className="lede">
          Reviewed seed phrases and clearly labelled automated references. AI drafts are useful for broad lookup,
          but they are not native-reviewed lessons.
        </p>
      </section>
      <section className="panel draft-disclosure">
        <strong>What the labels mean</strong>
        <p className="small muted">
          {libraryDraftCounts.safe} source-linked AI drafts are available; {libraryDraftCounts.caution} high-stakes
          entries carry caution labels. {libraryDraftCounts.held} structurally incomplete entries are excluded and
          remain in Admin for later review. None are added to your learning course or packaged audio.
        </p>
      </section>
      <section className="panel library-tools">
        <label className="small" htmlFor="library-search">Search English, Kannada, romanization, or tags</label>
        <input
          id="library-search"
          className="search-input"
          type="search"
          placeholder="Try airport, water, ಸಮಯ, shopping…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="small" htmlFor="library-category">Category</label>
        <select id="library-category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>
      <div className="filter-row library-filters" role="group" aria-label="Filter library by review status">
        {["reference", "approved", "ai_draft", "ai_draft_caution"].map((item) => (
          <button key={item} className={status === item ? "button" : "button secondary"} type="button" aria-pressed={status === item} onClick={() => setStatus(item)}>
            {item === "reference" ? "all references" : item === "ai_draft_caution" ? "AI caution" : item.replaceAll("_", " ")} ({counts[item]})
          </button>
        ))}
        <Link className="button secondary" href="/admin">
          Review queues
        </Link>
      </div>
      <p className="small muted" role="status">
        Showing {visible.length} of {results.length} matching references
      </p>
      <section className="grid">
        {visible.map((phrase) => (
          <PhraseCard key={phrase.id} phrase={phrase} />
        ))}
        {visible.length === 0 ? <p className="panel muted">No phrases match this filter.</p> : null}
      </section>
      {visible.length < results.length ? (
        <button className="button secondary" type="button" onClick={() => setVisibleCount((count) => count + 60)}>
          Show 60 more
        </button>
      ) : null}
    </div>
  );
}
