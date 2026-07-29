export type PhraseStatus =
  | "raw_imported"
  | "ai_draft"
  | "ai_draft_caution"
  | "human_review_required"
  | "approved"
  | "rejected"
  | "needs_edit";

export type AutomatedReviewQueue =
  | "automated_reference"
  | "standard_human_review"
  | "priority_human_review";

export type PhraseAutomation = {
  draftId: string;
  sourceId: string;
  sourceOccurrence: number;
  sourceHash: string;
  risk: "low" | "medium" | "high";
  issues: string[];
  draftConfidence: number;
  reviewQueue: AutomatedReviewQueue;
  publicationEligibility: "library_ai_draft" | "library_ai_draft_caution" | "hold_for_human_review";
  reviewClaim: "not_human_or_native_reviewed";
  register: "polite" | "neutral" | "casual" | "formal" | "context_dependent";
  bengaluruNaturalness:
    | "general_kannada_candidate"
    | "variant_selection_needed"
    | "bookish_or_specialized"
    | "unverified_high_stakes"
    | "unverified";
  sourcePhrase: {
    english: string;
    kannadaScript: string;
    kannadaRoman: string;
    category: string;
    tags: string[];
  };
};

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
  automation?: PhraseAutomation;
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

export type LearningMode = "speaking" | "speaking_and_reading";
export type RomanizationPreference = "always" | "when_needed" | "hidden";

export type LearningPreferences = {
  learningMode: LearningMode;
  romanization: RomanizationPreference;
  sessionMinutes: 5 | 10 | 15;
};

export type ConceptForm = {
  phraseId: string;
  kannadaScript: string;
  kannadaRoman: string;
  literalMeaning?: string;
  register: "polite" | "neutral" | "casual" | "formal";
  variety: "bengaluru-colloquial" | "standard-spoken" | "literary";
  usePriority: "produce" | "recognize" | "reference";
  review: {
    status: "needs_native_review" | "reviewed";
    source: "manual_course_draft" | "native_review";
    reviewer?: string;
    reviewedAt?: string;
  };
};

export type LearningConcept = {
  id: string;
  intent: string;
  situation: string;
  missionId: string;
  missionTitle: string;
  pattern?: string;
  pronunciationNote?: string;
  usageNote?: string;
  form: ConceptForm;
  audioUrl?: string;
};

export type PracticeOutcome = "independent" | "hinted" | "missed";
export type ReadingOutcome = "read" | "hinted" | "skipped";

export type LearningEvidence = {
  conceptId: string;
  activity: "cued_production" | "script_reading" | "grapheme_recognition";
  outcome: PracticeOutcome | ReadingOutcome;
  hintsUsed: number;
  occurredAt: string;
  corrective?: boolean;
  migrated?: boolean;
};

export type OrthographySymbol = {
  grapheme: string;
  sound: string;
  cue: string;
  example?: string;
};

export type OrthographyUnit = {
  id: string;
  order: number;
  title: string;
  kind: "independent_vowels" | "consonants" | "signs" | "vowel_signs" | "virama" | "conjuncts";
  explanation: string;
  symbols: OrthographySymbol[];
  recognition: Array<{
    prompt: string;
    answer: string;
    options: string[];
  }>;
};

export type OrthographyProgress = {
  unitId: string;
  attempts: number;
  successes: number;
  stabilityDays: number;
  lastSeenAt: string;
  nextReviewAt: string;
};

export type ConceptProgress = {
  conceptId: string;
  attempts: number;
  successes: number;
  lapses: number;
  stabilityDays: number;
  lastSeenAt: string;
  nextReviewAt: string;
  readingAttempts: number;
  readingSuccesses: number;
};

export type LearningState = {
  concepts: Record<string, ConceptProgress>;
  orthography: Record<string, OrthographyProgress>;
  evidence: LearningEvidence[];
};
