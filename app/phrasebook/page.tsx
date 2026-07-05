"use client";

import { useMemo, useState } from "react";
import { allPhrases } from "@/data/all-phrases";
import { PhraseCard } from "@/components/PhraseCard";
import { categoriesFor, searchPhrases } from "@/lib/search";
import { mergeOverrides } from "@/lib/libraryStore";

export default function PhrasebookPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const phrases = useMemo(() => mergeOverrides(allPhrases), []);
  const categories = categoriesFor(phrases);
  const results = searchPhrases(phrases, query, category);

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Phrasebook</p>
        <h1>Find words fast</h1>
        <p className="lede">Approved practical phrases appear first, with raw imported candidates lower in the list.</p>
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
      </section>
      <section className="grid">
        {results.map((phrase) => (
          <PhraseCard key={phrase.id} phrase={phrase} />
        ))}
      </section>
    </div>
  );
}
