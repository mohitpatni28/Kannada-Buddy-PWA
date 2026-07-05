"use client";

import { useMemo, useState } from "react";
import { allPhrases } from "@/data/all-phrases";
import { AdminPhraseCard } from "@/components/AdminPhraseCard";
import { mergeOverrides } from "@/lib/libraryStore";

export default function AdminPage() {
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState("raw_imported");
  const phrases = useMemo(() => mergeOverrides(allPhrases), [version]);
  const visible = phrases.filter((phrase) => filter === "all" || phrase.status === filter);

  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Admin</p>
        <h1>Curate phrases</h1>
        <p className="lede">Approve, reject, edit, tag, and test audio. Changes are stored locally in this browser for the personal MVP.</p>
      </section>
      <section className="panel">
        <div className="filter-row">
          {["raw_imported", "needs_edit", "approved", "rejected", "all"].map((item) => (
            <button key={item} className={filter === item ? "button" : "button secondary"} type="button" onClick={() => setFilter(item)}>
              {item.replace("_", " ")}
            </button>
          ))}
        </div>
      </section>
      <section className="grid">
        {visible.map((phrase) => (
          <AdminPhraseCard key={phrase.id} phrase={phrase} onChange={() => setVersion((value) => value + 1)} />
        ))}
      </section>
    </div>
  );
}
