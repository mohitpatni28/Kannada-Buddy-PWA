import type { LearningConcept } from "@/lib/types";
import audioPackData from "@/data/audio-pack.json";
import conceptReviewData from "@/data/concept-reviews.json";

const audioPack = audioPackData as Record<string, string>;
const conceptReviews = conceptReviewData as Record<string, LearningConcept["form"]["review"]>;

const concept = (
  id: string,
  intent: string,
  situation: string,
  missionId: string,
  missionTitle: string,
  kannadaRoman: string,
  kannadaScript: string,
  options: Partial<Pick<LearningConcept, "pattern" | "pronunciationNote" | "usageNote">> & {
    register?: LearningConcept["form"]["register"];
  } = {}
): LearningConcept => ({
  id,
  intent,
  situation,
  missionId,
  missionTitle,
  pattern: options.pattern,
  pronunciationNote: options.pronunciationNote,
  usageNote: options.usageNote,
  audioUrl: audioPack[id],
  form: {
    phraseId: id,
    kannadaScript: kannadaScript.normalize("NFC"),
    kannadaRoman,
    register: options.register ?? "polite",
    variety: "bengaluru-colloquial",
    usePriority: "produce",
    review: conceptReviews[id] ?? {
      status: "needs_native_review",
      source: "manual_course_draft"
    }
  }
});

export const learningConcepts: LearningConcept[] = [
  concept("greet-hello", "Greet someone politely", "You meet a neighbour or security guard.", "first-contact", "Start with respect", "Namaskara", "ನಮಸ್ಕಾರ", {
    usageNote: "A safe greeting at any time of day."
  }),
  concept("greet-thanks", "Thank someone", "Someone has helped you.", "first-contact", "Start with respect", "Dhanyavaadagalu", "ಧನ್ಯವಾದಗಳು", {
    pronunciationNote: "Keep the long aa sound in the middle."
  }),
  concept("greet-how-are-you", "Ask how someone is", "Continue a polite greeting.", "first-contact", "Start with respect", "Hegiddira?", "ಹೇಗಿದ್ದೀರಾ?", {
    usageNote: "This is the respectful form."
  }),
  concept("apt-come", "Ask someone to come", "You need the guard or maintenance staff to come over.", "get-help", "Ask for help", "Banni", "ಬನ್ನಿ", {
    pattern: "Banni is a polite everyday request to come."
  }),
  concept("apt-call", "Ask someone to call you", "You are arranging a callback.", "get-help", "Ask for help", "Nanage call maadi", "ನನಗೆ ಕಾಲ್ ಮಾಡಿ", {
    pattern: "[action] + maadi makes a polite request."
  }),
  concept("apt-water", "Say that the water is not coming", "You are reporting a water problem in your apartment.", "get-help", "Ask for help", "Neeru bartha illa", "ನೀರು ಬರ್ತಾ ಇಲ್ಲ", {
    pattern: "[thing/action] + illa expresses that something is absent or not happening.",
    register: "neutral"
  }),
  concept("auto-straight", "Ask the driver to go straight", "You are guiding an auto or cab.", "auto-ride", "Complete an auto ride", "Straight hogi", "ಸ್ಟ್ರೈಟ್ ಹೋಗಿ", {
  }),
  concept("auto-slow", "Ask the driver to go slowly", "The vehicle is moving too fast.", "auto-ride", "Complete an auto ride", "Nidhaanavaagi hogi", "ನಿಧಾನವಾಗಿ ಹೋಗಿ", {
    pronunciationNote: "Stretch the aa sounds slightly; do not rush the phrase."
  }),
  concept("auto-stop", "Ask the driver to stop here", "You have reached your destination.", "auto-ride", "Complete an auto ride", "Illi nillisi", "ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ", {
    pattern: "Illi means here; nillisi is a polite request to stop."
  }),
  concept("food-coffee", "Order one coffee", "You are ordering at a food counter.", "food-order", "Order at a counter", "Ondu coffee kodi", "ಒಂದು ಕಾಫಿ ಕೊಡಿ", {
    pattern: "[item] + kodi is a useful polite ordering pattern."
  }),
  concept("food-water", "Ask for water", "You need water with your meal.", "food-order", "Order at a counter", "Neeru kodi", "ನೀರು ಕೊಡಿ", {
    pattern: "Replace neeru with another item to reuse the kodi pattern."
  }),
  concept("food-less-spicy", "Ask for less spice", "You are ordering food and want it less spicy.", "food-order", "Order at a counter", "Swalpa khara kadime", "ಸ್ವಲ್ಪ ಖಾರ ಕಡಿಮೆ", {
    usageNote: "Say this before the order is prepared.",
    register: "neutral"
  }),
  concept("food-parcel", "Ask for takeaway", "You want the order packed to go.", "food-order", "Order at a counter", "Parcel kodi", "ಪಾರ್ಸೆಲ್ ಕೊಡಿ", {
  }),
  concept("shop-how-much-this", "Ask how much this costs", "You are checking a price in a shop.", "shop-pay", "Shop and pay", "Idhu eshtu?", "ಇದು ಎಷ್ಟು?", {
    pattern: "Idhu means this; eshtu asks how much."
  }),
  concept("shop-want-this", "Say that you want this", "You have chosen an item.", "shop-pay", "Shop and pay", "Idhu beku", "ಇದು ಬೇಕು", {
    pattern: "[thing] + beku expresses want or need."
  }),
  concept("shop-dont-want", "Say that you do not want it", "You are declining an item or offer.", "shop-pay", "Shop and pay", "Beda", "ಬೇಡ", {
    pronunciationNote: "The final sound is a retroflex da, made with the tongue curled slightly back.",
    usageNote: "A direct refusal. Tone and context affect how courteous it sounds.",
    register: "neutral"
  })
];

export const missionOrder = ["first-contact", "get-help", "auto-ride", "food-order", "shop-pay"];
