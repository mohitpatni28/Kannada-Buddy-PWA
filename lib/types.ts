export type PhraseStatus = "raw_imported" | "approved" | "rejected" | "needs_edit";

export type PhraseItem = {
  id: string;
  english: string;
  kannadaRoman: string;
  kannadaScript?: string;
  literalMeaning?: string;
  usageNote?: string;
  category: string;
  tags: string[];
  difficulty: "survival" | "easy" | "medium" | "advanced";
  source: "manual" | "wikivoyage" | "tatoeba" | "lingua_libre" | "other";
  sourceUrl?: string;
  license?: string;
  status: PhraseStatus;
  isBengaluruPractical: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Lesson = {
  id: string;
  title: string;
  scenario: string;
  category: string;
  level: "survival" | "beginner" | "intermediate";
  estimatedMinutes: number;
  itemIds: string[];
  mission?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewProgress = {
  phraseId: string;
  confidence: 1 | 2 | 3;
  lastSeenAt: string;
  nextReviewAt: string;
  correctCount: number;
  wrongCount: number;
};
