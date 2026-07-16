"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { allPhrases } from "@/data/all-phrases";
import { PhraseCard } from "@/components/PhraseCard";
import { mergeOverrides } from "@/lib/libraryStore";

export default function LibraryPage() {
  const [status, setStatus] = useState("approved");
  const phrases = useMemo(() => mergeOverrides(allPhrases), []);
  const visible = phrases.filter((phrase) => status === "all" || phrase.status === status);
  const counts = Object.fromEntries(
    ["all", "approved", "raw_imported", "needs_edit", "rejected"].map((item) => [
      item,
      item === "all" ? phrases.length : phrases.filter((phrase) => phrase.status === item).length
    ])
  );

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Library</p>
        <h1>All phrases</h1>
        <p className="lede">Browse reviewed phrases here. Unreviewed imports stay separated until they are curated.</p>
      </section>
      <div className="filter-row library-filters" role="group" aria-label="Filter library by review status">
        {["all", "approved", "raw_imported", "needs_edit", "rejected"].map((item) => (
          <button key={item} className={status === item ? "button" : "button secondary"} type="button" aria-pressed={status === item} onClick={() => setStatus(item)}>
            {item === "raw_imported" ? "unreviewed imports" : item.replaceAll("_", " ")} ({counts[item]})
          </button>
        ))}
        <Link className="button secondary" href="/admin">
          Admin
        </Link>
      </div>
      <section className="grid">
        {visible.map((phrase) => (
          <PhraseCard key={phrase.id} phrase={phrase} />
        ))}
        {visible.length === 0 ? <p className="panel muted">No phrases match this filter.</p> : null}
      </section>
    </div>
  );
}
