import { seedLessons } from "@/data/seed-lessons";
import { seedPhrases } from "@/data/seed-phrases";
import type { PhraseItem, ReviewProgress } from "@/lib/types";
import { isDue } from "@/lib/spacedRepetition";

export function getApprovedPhrases(phrases = seedPhrases) {
  return phrases.filter((phrase) => phrase.status === "approved" && phrase.isBengaluruPractical);
}

export function lessonForToday(date = new Date()) {
  const lessons = seedLessons;
  const index = Math.abs(Math.floor(date.getTime() / (24 * 60 * 60 * 1000))) % lessons.length;
  return lessons[index];
}

export function generateDailyLesson(progress: Record<string, ReviewProgress> = {}, phrases: PhraseItem[] = seedPhrases) {
  const lesson = lessonForToday();
  const lessonItems = lesson.itemIds
    .map((id) => phrases.find((phrase) => phrase.id === id))
    .filter((phrase): phrase is PhraseItem => Boolean(phrase));
  const newItems = lessonItems.filter((phrase) => !progress[phrase.id]).slice(0, 2);
  const dueReviewItems = getApprovedPhrases(phrases)
    .filter((phrase) => isDue(progress[phrase.id]))
    .filter((phrase) => !newItems.some((item) => item.id === phrase.id))
    .slice(0, 3);
  const listeningQuiz = lessonItems[2] ?? lessonItems[0];

  return {
    lesson,
    newItems,
    reviewItems: dueReviewItems,
    listeningQuiz,
    mission: lesson.mission
  };
}
