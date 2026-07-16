"use client";

import { useMemo, useState } from "react";
import { allPhrases } from "@/data/all-phrases";
import { PhraseCard } from "@/components/PhraseCard";
import { categoriesFor, searchPhrases } from "@/lib/search";
import { mergeOverrides } from "@/lib/libraryStore";

export default function PhrasebookPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [includeCandidates, setIncludeCandidates] = useState(false);
  const phrases = useMemo(() => mergeOverrides(allPhrases), []);
  const searchable = includeCandidates ? phrases.filter((phrase) => phrase.status !== "rejected") : phrases.filter((phrase) => phrase.status === "approved");
  const categories = categoriesFor(searchable);
  const results = searchPhrases(searchable, query, category);

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Phrasebook</p>
        <h1>Find words fast</h1>
        <p className="lede">Search reviewed, practical phrases for everyday Bengaluru situations.</p>
      </section>
      <section className="panel">
        <input
          className="search-input"
          type="search"
          placeholder="Search less spicy, UPI, plumber, stop here..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="filter-row">
          <button className={category === "all" ? "button" : "button secondary"} type="button" onClick={() => setCategory("all")}>
            All
          </button>
          {categories.map((item) => (
            <button key={item} className={category === item ? "button" : "button secondary"} type="button" onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
        <label className="candidate-toggle small">
          <input type="checkbox" checked={includeCandidates} onChange={(event) => { setIncludeCandidates(event.target.checked); setCategory("all"); }} />
          Include unreviewed imports
        </label>
      </section>
      <section className="grid">
        {results.map((phrase) => (
          <PhraseCard key={phrase.id} phrase={phrase} />
        ))}
        {results.length === 0 ? <p className="panel muted">No matching phrases. Try a shorter search or another category.</p> : null}
      </section>
    </div>
  );
}
