import type { PhraseItem } from "@/lib/types";

export function searchPhrases(phrases: PhraseItem[], query: string, category = "all") {
  const q = query.trim().toLowerCase();

  return phrases
    .filter((phrase) => category === "all" || phrase.category === category)
    .filter((phrase) => {
      if (!q) return true;
      return [
        phrase.english,
        phrase.kannadaRoman,
        phrase.kannadaScript ?? "",
        phrase.category,
        ...phrase.tags,
        phrase.usageNote ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      if (a.status === "approved" && b.status !== "approved") return -1;
      if (a.status !== "approved" && b.status === "approved") return 1;
      if (a.isBengaluruPractical && !b.isBengaluruPractical) return -1;
      if (!a.isBengaluruPractical && b.isBengaluruPractical) return 1;
      return a.english.localeCompare(b.english);
    });
}

export function categoriesFor(phrases: PhraseItem[]) {
  return Array.from(new Set(phrases.map((phrase) => phrase.category))).sort();
}
