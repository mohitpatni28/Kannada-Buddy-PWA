// Existing source IDs are intentional: course selection must preserve reference progress.
// Selection is editorial, not a linguistic or native-speaker review.
export const courseScenarios = [
  { id: "everyday", title: "Everyday conversation" },
  { id: "home-stay", title: "Home and stays" },
  { id: "auto-travel", title: "Autos and public transport" },
  { id: "food-counter", title: "Food and cafes" },
  { id: "shopping", title: "Shopping and payment" },
  { id: "directions", title: "Finding your way" },
  { id: "meeting-time", title: "Time and meeting up" },
  { id: "phone-calls", title: "Phone calls" },
 ] as const;

export type CourseScenarioId = (typeof courseScenarios)[number]["id"];

export const scenarioReferenceIds: Record<CourseScenarioId, readonly string[]> = {
  "everyday": [
    "wv-useful-phrases-i-am-fine#1",
    "wv-useful-phrases-what-s-your-name-plural-with-respect#1",
    "wv-useful-phrases-my-name-is#1",
    "wv-useful-phrases-where-are-you-from-plural-with-respect#1",
    "wv-useful-phrases-i-m-from#1",
    "wv-useful-phrases-please-speak-more-slowly#1",
    "wv-useful-phrases-please-say-that-again#1",
    "wv-useful-phrases-ok-see-you-next-time#1",
    "wv-more-basics-it-is-o-k#1",
    "wv-more-basics-alright#1",
    "wv-useful-phrases-how-is-your-family-is-everyone-well-at-home#1",
    "wv-useful-phrases-everyone-is-fine#1",
  ],
  "home-stay": [
    "wv-lodging-do-you-have-any-rooms-available#1",
    "wv-lodging-how-much-is-a-room-for-one-person-two-people#1",
    "wv-lodging-does-the-room-come-with-bedsheets#1",
    "wv-lodging-does-the-room-come-with-bathroom#1",
    "wv-lodging-may-i-see-the-room-first#1",
    "wv-lodging-do-you-have-anything-cheaper#1",
    "wv-lodging-please-clean-my-room#1",
    "wv-lodging-i-want-to-check-out#1",
    "wv-lodging-what-time-is-breakfast-supper#1",
  ],
  "auto-travel": [
    "wv-taxi-take-me-to-please#1",
    "wv-taxi-how-much-does-it-cost-to-get-to#1",
    "wv-taxi-take-me-there-please#1",
    "wv-taxi-please-use-the-meter-machine#1",
    "wv-bus-and-train-how-much-is-a-ticket-to#1",
    "wv-bus-and-train-one-ticket-to-please#1",
    "wv-bus-and-train-where-does-this-train-bus-go#1",
    "wv-bus-and-train-does-this-train-bus-stop-in#1",
    "wv-bus-and-train-when-does-the-train-bus-for-leave#1",
  ],
  "food-counter": [
    "wv-eating-can-i-look-at-the-menu-please#1",
    "wv-eating-is-there-a-local-specialty#1",
    "wv-eating-can-you-make-it-lite-please-less-oil-butter-lard#1",
    "wv-eating-i-want#1",
    "wv-eating-may-i-have-a-glass-of#1",
    "wv-eating-may-i-have-a-cup-of#1",
    "wv-eating-may-i-have-a-bottle-of#1",
    "wv-eating-may-i-have-some#1",
    "wv-eating-excuse-me-waiter-getting-attention-of-server#1",
    "wv-eating-i-m-finished#1",
    "wv-eating-it-was-delicious#1",
    "wv-eating-the-check-please#1",
  ],
  "shopping": [
    "wv-shopping-do-you-have-this-in-my-size#1",
    "wv-shopping-that-s-too-expensive#1",
    "wv-shopping-would-you-take#1",
    "wv-shopping-i-can-t-afford-it#1",
    "wv-shopping-ok-i-ll-take-it#1",
    "wv-shopping-can-i-have-a-bag#1",
    "wv-shopping-i-need#1",
    "wv-money-do-you-accept-credit-cards#1",
    "wv-money-where-is-an-automatic-teller-machine-atm#1",
  ],
  "directions": [
    "wv-directions-how-do-i-get-to#1",
    "wv-directions-how-do-i-get-to-the-bus-station#1",
    "wv-directions-how-do-i-get-to-the-airport#1",
    "wv-directions-how-do-i-get-to-the-hotel#1",
    "wv-more-directions-can-you-show-me-on-the-map#1",
    "wv-more-directions-turn-left#1",
    "wv-more-directions-turn-right#1",
    "wv-more-directions-right-in-front-of-you#1",
    "wv-more-directions-past-the#1",
    "wv-more-directions-before-the#1",
    "wv-more-directions-watch-for-the#1",
  ],
  "meeting-time": [
    "wv-useful-phrases-can-we-meet-today#1",
    "wv-useful-phrases-we-will-meet-today-at-4-o-clock#1",
    "wv-useful-phrases-what-s-the-time-now#1",
    "wv-time-now#1",
    "wv-time-later#1",
    "wv-time-morning#1",
    "wv-time-evening#1",
    "wv-days-today#1",
    "wv-days-yesterday#1",
    "wv-days-tomorrow#1",
    "wv-days-this-week#1",
    "wv-days-next-week#1",
  ],
  "phone-calls": [
    "wv-on-the-phone-hello-only-on-the-phone#1",
    "wv-on-the-phone-may-i-speak-to#1",
    "wv-on-the-phone-is-there#1",
    "wv-on-the-phone-who-is-calling-lit-who-is-speaking#1",
    "wv-on-the-phone-one-moment-please#1",
    "wv-on-the-phone-is-not-here-right-now#1",
    "wv-on-the-phone-i-will-call-you-again-later#1",
    "wv-on-the-phone-you-have-got-the-wrong-number#1",
    "wv-on-the-phone-the-line-is-busy#1",
    "wv-on-the-phone-what-is-your-phone-number#1",
  ],
};

export const selectedReferenceScenario = new Map(
  courseScenarios.flatMap((scenario) =>
    scenarioReferenceIds[scenario.id].map((id) => [id, scenario] as const)
  )
);

export const coreScenarioByMission: Record<string, CourseScenarioId> = {
  "first-contact": "everyday",
  "get-help": "home-stay",
  "auto-ride": "auto-travel",
  "food-order": "food-counter",
  "shop-pay": "shopping"
};
