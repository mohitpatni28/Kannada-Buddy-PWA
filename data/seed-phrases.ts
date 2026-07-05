import type { PhraseItem } from "@/lib/types";

const now = "2026-07-05T00:00:00.000Z";

const phrase = (
  id: string,
  english: string,
  kannadaRoman: string,
  kannadaScript: string,
  category: string,
  tags: string[],
  usageNote?: string
): PhraseItem => ({
  id,
  english,
  kannadaRoman,
  kannadaScript,
  usageNote,
  category,
  tags,
  difficulty: "survival",
  source: "manual",
  license: "Personal curated seed phrase",
  status: "approved",
  isBengaluruPractical: true,
  createdAt: now,
  updatedAt: now
});

export const seedPhrases: PhraseItem[] = [
  phrase("greet-hello", "Hello", "Namaskara", "ನಮಸ್ಕಾರ", "greetings", ["polite", "basic"]),
  phrase("greet-how-are-you", "How are you?", "Hegiddira?", "ಹೇಗಿದ್ದೀರಾ?", "greetings", ["polite", "small_talk"]),
  phrase("greet-fine", "I am fine", "Chennagiddini", "ಚೆನ್ನಾಗಿದ್ದೀನಿ", "greetings", ["small_talk"]),
  phrase("greet-name-you", "What is your name?", "Nimma hesaru enu?", "ನಿಮ್ಮ ಹೆಸರು ಏನು?", "greetings", ["small_talk"]),
  phrase("greet-name-me", "My name is Mohit", "Nanna hesaru Mohit", "ನನ್ನ ಹೆಸರು ಮೋಹಿತ್", "greetings", ["personal"]),
  phrase("greet-thanks", "Thank you", "Dhanyavaadagalu", "ಧನ್ಯವಾದಗಳು", "greetings", ["polite"]),
  phrase("auto-straight", "Go straight", "Straight hogi", "ಸ್ಟ್ರೈಟ್ ಹೋಗಿ", "auto", ["directions", "cab"]),
  phrase("auto-left", "Take left", "Left tagoli", "ಲೆಫ್ಟ್ ತಗೊಳ್ಳಿ", "auto", ["directions", "cab"]),
  phrase("auto-right", "Take right", "Right tagoli", "ರೈಟ್ ತಗೊಳ್ಳಿ", "auto", ["directions", "cab"]),
  phrase("auto-stop", "Stop here", "Illi nillisi", "ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ", "auto", ["directions", "cab"], "Useful near your destination."),
  phrase("auto-slow", "Go slowly", "Nidhaanavaagi hogi", "ನಿಧಾನವಾಗಿ ಹೋಗಿ", "auto", ["directions", "cab"]),
  phrase("auto-how-much", "How much?", "Eshtu?", "ಎಷ್ಟು?", "auto", ["price", "shop"]),
  phrase("food-coffee", "Give one coffee", "Ondu coffee kodi", "ಒಂದು ಕಾಫಿ ಕೊಡಿ", "food", ["ordering"]),
  phrase("food-less-spicy", "Less spicy", "Swalpa khara kadime", "ಸ್ವಲ್ಪ ಖಾರ ಕಡಿಮೆ", "food", ["ordering", "spice"]),
  phrase("food-no-onion", "No onion", "Eerulli beda", "ಈರುಳ್ಳಿ ಬೇಡ", "food", ["ordering"]),
  phrase("food-parcel", "Parcel please", "Parcel kodi", "ಪಾರ್ಸೆಲ್ ಕೊಡಿ", "food", ["takeaway"]),
  phrase("food-enough", "Enough", "Saaku", "ಸಾಕು", "food", ["ordering"], "A tiny but powerful food-counter phrase."),
  phrase("food-water", "Water please", "Neeru kodi", "ನೀರು ಕೊಡಿ", "food", ["ordering"]),
  phrase("shop-how-much-this", "How much is this?", "Idhu eshtu?", "ಇದು ಎಷ್ಟು?", "shop", ["price", "payment"]),
  phrase("shop-half-kg", "Give half kg", "Ardha kg kodi", "ಅರ್ಧ ಕೆಜಿ ಕೊಡಿ", "shop", ["quantity"]),
  phrase("shop-have-this", "Do you have this?", "Idhu ideya?", "ಇದು ಇದೆಯಾ?", "shop", ["availability"]),
  phrase("shop-dont-want", "I do not want", "Beda", "ಬೇಡ", "shop", ["refusal"]),
  phrase("shop-want-this", "I want this", "Idhu beku", "ಇದು ಬೇಕು", "shop", ["buying"]),
  phrase("shop-upi", "I will pay by UPI", "UPI maadthini", "ಯುಪಿಐ ಮಾಡ್ತೀನಿ", "shop", ["payment", "upi"]),
  phrase("apt-water", "Water is not coming", "Neeru bartha illa", "ನೀರು ಬರ್ತಾ ಇಲ್ಲ", "apartment", ["maintenance"]),
  phrase("apt-electricity", "Electricity is gone", "Current illa", "ಕರೆಂಟ್ ಇಲ್ಲ", "apartment", ["maintenance"]),
  phrase("apt-come", "Please come", "Banni", "ಬನ್ನಿ", "apartment", ["staff", "polite"]),
  phrase("apt-tomorrow", "Come tomorrow", "Naale banni", "ನಾಳೆ ಬನ್ನಿ", "apartment", ["staff"]),
  phrase("apt-call", "Call me", "Nanage call maadi", "ನನಗೆ ಕಾಲ್ ಮಾಡಿ", "apartment", ["phone", "staff"]),
  phrase("apt-plumber", "Send plumber", "Plumber kalisi", "ಪ್ಲಂಬರ್ ಕಳಿಸಿ", "apartment", ["maintenance", "staff"]),
  {
    ...phrase("raw-wikivoyage-good-morning", "Good morning", "Shubhodaya", "ಶುಭೋದಯ", "greetings", ["raw_import", "polite"]),
    source: "wikivoyage",
    sourceUrl: "https://en.wikivoyage.org/wiki/Kannada_phrasebook",
    license: "CC BY-SA",
    status: "raw_imported",
    isBengaluruPractical: false
  }
];
