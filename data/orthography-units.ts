import type { OrthographyUnit, OrthographySymbol } from "@/lib/types";

const symbol = (grapheme: string, sound: string, cue: string, example?: string): OrthographySymbol => ({
  grapheme,
  sound,
  cue,
  example
});

const unit = (
  id: string,
  order: number,
  title: string,
  kind: OrthographyUnit["kind"],
  explanation: string,
  symbols: OrthographySymbol[]
): OrthographyUnit => ({
  id,
  order,
  title,
  kind,
  explanation,
  symbols,
  recognition: symbols.slice(0, Math.min(4, symbols.length)).map((item, index) => {
    const distractors = symbols.filter((candidate) => candidate.grapheme !== item.grapheme);
    const rotated = [...distractors.slice(index), ...distractors.slice(0, index)].slice(0, 3);
    const options = rotated.map((candidate) => candidate.grapheme);
    options.splice(index % (options.length + 1), 0, item.grapheme);
    return {
      prompt: `Choose the Kannada form for “${item.sound}”.`,
      answer: item.grapheme,
      options
    };
  })
});

export const orthographyUnits: OrthographyUnit[] = [
  unit("vowels-a-i", 1, "Independent vowels: a to ī", "independent_vowels", "Independent vowels stand on their own, usually at the beginning of a syllable.", [
    symbol("ಅ", "a", "short a"), symbol("ಆ", "ā / aa", "long aa"), symbol("ಇ", "i", "short i"), symbol("ಈ", "ī / ee", "long ee")
  ]),
  unit("vowels-u-e", 2, "Independent vowels: u to ē", "independent_vowels", "Notice how each long vowel has its own independent letter.", [
    symbol("ಉ", "u", "short u"), symbol("ಊ", "ū / oo", "long oo"), symbol("ಎ", "e", "short e"), symbol("ಏ", "ē / ay", "long e")
  ]),
  unit("vowels-ai-au", 3, "Independent vowels: ai to au", "independent_vowels", "These complete the high-frequency independent vowel set; ಋ is mainly useful in Sanskrit-derived words.", [
    symbol("ಐ", "ai", "as in aisle"), symbol("ಒ", "o", "short o"), symbol("ಓ", "ō / oh", "long o"), symbol("ಔ", "au", "as in cow"), symbol("ಋ", "r̥ / ru", "vocalic r")
  ]),
  unit("consonants-ka", 4, "The ka row", "consonants", "A consonant letter carries an inherent a sound unless a vowel sign or virama changes it.", [
    symbol("ಕ", "ka", "unaspirated k"), symbol("ಖ", "kha", "aspirated kh"), symbol("ಗ", "ga", "voiced g"), symbol("ಘ", "gha", "aspirated gh"), symbol("ಙ", "ṅa / nga", "velar nasal")
  ]),
  unit("consonants-cha", 5, "The cha row", "consonants", "Compare the unaspirated and aspirated pairs before the nasal letter.", [
    symbol("ಚ", "cha", "unaspirated ch"), symbol("ಛ", "chha", "aspirated ch"), symbol("ಜ", "ja", "voiced j"), symbol("ಝ", "jha", "aspirated jh"), symbol("ಞ", "ña / nya", "palatal nasal")
  ]),
  unit("consonants-retroflex", 6, "The retroflex row", "consonants", "Retroflex sounds are made with the tongue curled slightly back.", [
    symbol("ಟ", "ṭa", "retroflex t"), symbol("ಠ", "ṭha", "aspirated retroflex t"), symbol("ಡ", "ḍa", "retroflex d"), symbol("ಢ", "ḍha", "aspirated retroflex d"), symbol("ಣ", "ṇa", "retroflex n")
  ]),
  unit("consonants-dental", 7, "The dental row", "consonants", "Dental sounds are made with the tongue near the upper teeth.", [
    symbol("ತ", "ta", "dental t"), symbol("ಥ", "tha", "aspirated dental t"), symbol("ದ", "da", "dental d"), symbol("ಧ", "dha", "aspirated dental d"), symbol("ನ", "na", "dental n", "ನಮಸ್ಕಾರ")
  ]),
  unit("consonants-pa", 8, "The pa row", "consonants", "These sounds are formed at the lips.", [
    symbol("ಪ", "pa", "unaspirated p"), symbol("ಫ", "pha / fa", "aspirated p; often f in loans"), symbol("ಬ", "ba", "voiced b"), symbol("ಭ", "bha", "aspirated bh"), symbol("ಮ", "ma", "m", "ನಮಸ್ಕಾರ")
  ]),
  unit("consonants-sonorants", 9, "Glides and liquids", "consonants", "These frequent consonants appear throughout everyday Kannada.", [
    symbol("ಯ", "ya", "y"), symbol("ರ", "ra", "r"), symbol("ಲ", "la", "l"), symbol("ವ", "va / wa", "between English v and w")
  ]),
  unit("consonants-sibilants", 10, "Sibilants and h", "consonants", "The three s-like letters occur in different word histories; ಹ represents ha.", [
    symbol("ಶ", "śa / sha", "palatal sh"), symbol("ಷ", "ṣa / sha", "retroflex sh"), symbol("ಸ", "sa", "s"), symbol("ಹ", "ha", "h"), symbol("ಳ", "ḷa", "retroflex l")
  ]),
  unit("yogavahas", 11, "Anusvara and visarga", "signs", "These signs follow a vowel or syllable: anusvara marks a nasal sound, while visarga marks a breath-like sound in words that use it.", [
    symbol("ಅಂ", "aṁ / am", "ಅ + ಂ"), symbol("ಅಃ", "aḥ / aha", "ಅ + ಃ")
  ]),
  unit("vowel-signs-front", 12, "Vowel signs on ಕ", "vowel_signs", "A dependent vowel sign changes the inherent a of a consonant. The sign is stored after the consonant even when part of it renders above or beside it.", [
    symbol("ಕ", "ka", "inherent a"), symbol("ಕಾ", "kā / kaa", "ಾ adds long aa"), symbol("ಕಿ", "ki", "ಿ adds short i"), symbol("ಕೀ", "kī / kee", "ೀ adds long ee"), symbol("ಕು", "ku", "ು adds short u"), symbol("ಕೂ", "kū / koo", "ೂ adds long oo")
  ]),
  unit("vowel-signs-back", 13, "More vowel signs on ಕ", "vowel_signs", "Read the consonant and its attached sign as one orthographic syllable.", [
    symbol("ಕೆ", "ke", "ೆ adds short e"), symbol("ಕೇ", "kē / kay", "ೇ adds long e"), symbol("ಕೈ", "kai", "ೈ adds ai"), symbol("ಕೊ", "ko", "ೊ adds short o"), symbol("ಕೋ", "kō / koh", "ೋ adds long o"), symbol("ಕೌ", "kau", "ೌ adds au")
  ]),
  unit("virama", 14, "Removing the inherent vowel", "virama", "The virama ್ suppresses the inherent a: ಕ is ka, while ಕ್ is k. This also helps form consonant clusters.", [
    symbol("ಕ್", "k", "ಕ + ್"), symbol("ನ್", "n", "ನ + ್"), symbol("ಮ್", "m", "ಮ + ್"), symbol("ಲ್", "l", "ಲ + ್")
  ]),
  unit("common-conjuncts", 15, "Common consonant clusters", "conjuncts", "A dead consonant followed by another consonant forms a cluster. Learn these as structured combinations, not unrelated pictures.", [
    symbol("ನ್ನ", "nna", "ನ್ + ನ", "ಬನ್ನಿ"), symbol("ಲ್ಲ", "lla", "ಲ್ + ಲ", "ಇಲ್ಲಿ"), symbol("ಸ್ವ", "sva", "ಸ್ + ವ", "ಸ್ವಲ್ಪ"), symbol("ಸ್ಟ್ರ", "sṭra", "ಸ್ + ಟ್ + ರ", "ಸ್ಟ್ರೈಟ್")
  ])
];
