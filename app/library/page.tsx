"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { allPhrases } from "@/data/all-phrases";
import { PhraseCard } from "@/components/PhraseCard";
import { mergeOverrides } from "@/lib/libraryStore";

export default function LibraryPage() {
  const [status, setStatus] = useState("all");
  const phrases = useMemo(() => mergeOverrides(allPhrases), []);
  const visible = phrases.filter((phrase) => status === "all" || phrase.status === status);

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Library</p>
        <h1>All phrases</h1>
        <p className="lede">Manual seed phrases and imported candidates live here. Learning surfaces use approved practical phrases first.</p>
      </section>
      <div className="action-row">
        {["all", "approved", "raw_imported", "needs_edit", "rejected"].map((item) => (
          <button key={item} className={status === item ? "button" : "button secondary"} type="button" onClick={() => setStatus(item)}>
            {item.replace("_", " ")}
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
      </section>
    </div>
  );
}
