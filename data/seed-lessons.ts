import type { Lesson } from "@/lib/types";

const now = "2026-07-05T00:00:00.000Z";

export const seedLessons: Lesson[] = [
  {
    id: "lesson-auto-directions",
    title: "Auto Directions",
    scenario: "Autos, cabs, and last-mile rides",
    category: "auto",
    level: "survival",
    estimatedMinutes: 5,
    itemIds: ["auto-stop", "auto-slow", "auto-straight", "auto-left", "auto-right", "auto-how-much"],
    mission: "Use “Illi nillisi” once when you reach your destination.",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "lesson-food-counter",
    title: "Food Counter",
    scenario: "Coffee, parcel, spice level, and water",
    category: "food",
    level: "survival",
    estimatedMinutes: 5,
    itemIds: ["food-coffee", "food-less-spicy", "food-no-onion", "food-parcel", "food-enough", "food-water"],
    mission: "Say “Saaku” once while ordering or serving food.",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "lesson-shop-payment",
    title: "Shops and UPI",
    scenario: "Buying small things and paying",
    category: "shop",
    level: "survival",
    estimatedMinutes: 5,
    itemIds: ["shop-how-much-this", "shop-have-this", "shop-want-this", "shop-dont-want", "shop-half-kg", "shop-upi"],
    mission: "Ask “Idhu eshtu?” before paying for one small item.",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "lesson-apartment-help",
    title: "Apartment Help",
    scenario: "Security, staff, repairs, and calls",
    category: "apartment",
    level: "survival",
    estimatedMinutes: 5,
    itemIds: ["apt-water", "apt-electricity", "apt-come", "apt-tomorrow", "apt-call", "apt-plumber"],
    mission: "Use “Nanage call maadi” the next time you need a callback.",
    createdAt: now,
    updatedAt: now
  }
];
