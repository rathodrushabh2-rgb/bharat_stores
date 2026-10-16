// English → Hindi for product names, fully offline.
// 1. Known phrases and words (grocery items, brands, units) come from a dictionary.
// 2. Anything else is written phonetically in Devanagari ("Haldiram" → "हल्दिराम").
// The result is a suggestion: the owner can always correct it.

const PHRASES: Record<string, string> = {
  "black pepper": "काली मिर्च",
  "red chilli": "लाल मिर्च",
  "red chili": "लाल मिर्च",
  "green chilli": "हरी मिर्च",
  "green chili": "हरी मिर्च",
  "rock salt": "सेंधा नमक",
  "black salt": "काला नमक",
  "bay leaf": "तेज पत्ता",
  "mustard oil": "सरसों का तेल",
  "mustard seeds": "राई",
  "washing powder": "वॉशिंग पाउडर",
  "detergent powder": "डिटर्जेंट पाउडर",
  "garam masala": "गरम मसाला",
  "cold drink": "कोल्ड ड्रिंक",
  "red label": "रेड लेबल",
  "good day": "गुड डे",
  "dry fruits": "सूखे मेवे",
  "brown sugar": "ब्राउन शुगर",
  "sugar free": "शुगर फ्री",
  "close up": "क्लोज़अप",
};

const WORDS: Record<string, string> = {
  // staples
  sugar: "चीनी", cheeni: "चीनी", chini: "चीनी", salt: "नमक", namak: "नमक", rice: "चावल", chawal: "चावल",
  wheat: "गेहूं", gehun: "गेहूं", gehu: "गेहूं", flour: "आटा", atta: "आटा", aata: "आटा", maida: "मैदा", besan: "बेसन",
  suji: "सूजी", sooji: "सूजी", semolina: "सूजी", rava: "रवा", poha: "पोहा", oats: "ओट्स", corn: "मक्का", makka: "मक्का",
  bajra: "बाजरा", jowar: "ज्वार", ragi: "रागी", millet: "बाजरा", sabudana: "साबूदाना", sago: "साबूदाना",
  vermicelli: "सेवई", sevai: "सेवई", noodles: "नूडल्स", pasta: "पास्ता", basmati: "बासमती", broken: "टुकड़ा",
  // dals
  dal: "दाल", daal: "दाल", lentil: "दाल", lentils: "दाल", toor: "तूर", tur: "तूर", arhar: "अरहर", moong: "मूंग",
  mung: "मूंग", masoor: "मसूर", masur: "मसूर", urad: "उड़द", chana: "चना", chickpea: "छोले", chickpeas: "छोले",
  chole: "छोले", kabuli: "काबुली", rajma: "राजमा", lobia: "लोबिया", matar: "मटर", peas: "मटर",
  // oils & dairy
  oil: "तेल", tel: "तेल", mustard: "सरसों", sarson: "सरसों", groundnut: "मूंगफली", peanut: "मूंगफली",
  peanuts: "मूंगफली", sunflower: "सूरजमुखी", soyabean: "सोयाबीन", soybean: "सोयाबीन", soya: "सोया",
  refined: "रिफाइंड", ghee: "घी", butter: "मक्खन", milk: "दूध", doodh: "दूध", curd: "दही", dahi: "दही",
  paneer: "पनीर", cheese: "चीज़", cream: "क्रीम", cow: "गाय", buffalo: "भैंस", toned: "टोंड",
  // spices
  turmeric: "हल्दी", haldi: "हल्दी", coriander: "धनिया", dhaniya: "धनिया", dhania: "धनिया", cumin: "जीरा",
  jeera: "जीरा", jira: "जीरा", chilli: "मिर्च", chili: "मिर्च", mirch: "मिर्च", pepper: "मिर्च",
  cardamom: "इलायची", elaichi: "इलायची", clove: "लौंग", cloves: "लौंग", laung: "लौंग", cinnamon: "दालचीनी",
  fennel: "सौंफ", saunf: "सौंफ", fenugreek: "मेथी", methi: "मेथी", asafoetida: "हींग", hing: "हींग",
  ajwain: "अजवाइन", carom: "अजवाइन", kalonji: "कलौंजी", rai: "राई", sesame: "तिल", til: "तिल",
  saffron: "केसर", kesar: "केसर", tamarind: "इमली", imli: "इमली", amchur: "अमचूर", kasuri: "कसूरी",
  masala: "मसाला", spice: "मसाला", spices: "मसाले", garam: "गरम", powder: "पाउडर", whole: "साबुत",
  // dry fruits & sweet
  almond: "बादाम", almonds: "बादाम", badam: "बादाम", cashew: "काजू", cashews: "काजू", kaju: "काजू",
  raisin: "किशमिश", raisins: "किशमिश", kishmish: "किशमिश", walnut: "अखरोट", walnuts: "अखरोट",
  dates: "खजूर", khajur: "खजूर", coconut: "नारियल", jaggery: "गुड़", gur: "गुड़", gud: "गुड़", honey: "शहद",
  // vegetables & fruit
  potato: "आलू", potatoes: "आलू", aloo: "आलू", onion: "प्याज़", onions: "प्याज़", pyaz: "प्याज़",
  tomato: "टमाटर", tomatoes: "टमाटर", garlic: "लहसुन", ginger: "अदरक", lemon: "नींबू", banana: "केला",
  apple: "सेब", mango: "आम", egg: "अंडा", eggs: "अंडे",
  // packaged
  tea: "चाय", chai: "चाय", coffee: "कॉफ़ी", biscuit: "बिस्कुट", biscuits: "बिस्कुट", bread: "ब्रेड",
  namkeen: "नमकीन", chips: "चिप्स", chocolate: "चॉकलेट", juice: "जूस", water: "पानी", drink: "ड्रिंक",
  papad: "पापड़", pickle: "अचार", achar: "अचार", sauce: "सॉस", ketchup: "केचप", jam: "जैम", vinegar: "सिरका",
  // household
  soap: "साबुन", detergent: "डिटर्जेंट", shampoo: "शैम्पू", toothpaste: "टूथपेस्ट", brush: "ब्रश",
  matchbox: "माचिस", matches: "माचिस", candle: "मोमबत्ती", candles: "मोमबत्ती", agarbatti: "अगरबत्ती",
  incense: "अगरबत्ती", washing: "वॉशिंग", bar: "बार", liquid: "लिक्विड",
  // descriptors
  red: "लाल", green: "हरा", black: "काला", white: "सफ़ेद", yellow: "पीला", brown: "ब्राउन", small: "छोटा",
  big: "बड़ा", large: "बड़ा", fresh: "ताज़ा", dry: "सूखा", pure: "शुद्ध", desi: "देसी", special: "स्पेशल",
  premium: "प्रीमियम", gold: "गोल्ड", super: "सुपर", classic: "क्लासिक", extra: "एक्स्ट्रा", double: "डबल",
  full: "फुल", free: "फ्री", rock: "सेंधा", leaf: "पत्ता", seeds: "बीज", seed: "बीज", sona: "सोना",
  // units & packs
  kg: "किलो", kgs: "किलो", kilo: "किलो", gm: "ग्राम", gms: "ग्राम", gram: "ग्राम", grams: "ग्राम",
  ml: "मि.ली.", ltr: "लीटर", litre: "लीटर", liter: "लीटर", pcs: "नग", pc: "नग", piece: "नग",
  dozen: "दर्जन", packet: "पैकेट", pack: "पैक", pouch: "पाउच", box: "डिब्बा", bottle: "बोतल", jar: "जार",
  bag: "बोरी", tin: "टिन", combo: "कॉम्बो",
  // brands
  tata: "टाटा", aashirvaad: "आशीर्वाद", ashirvad: "आशीर्वाद", aashirvad: "आशीर्वाद", fortune: "फॉर्च्यून",
  parle: "पारले", britannia: "ब्रिटानिया", amul: "अमूल", patanjali: "पतंजलि", dabur: "डाबर", everest: "एवरेस्ट",
  mdh: "एमडीएच", catch: "कैच", saffola: "सफोला", dhara: "धारा", maggi: "मैगी", haldiram: "हल्दीराम",
  haldirams: "हल्दीराम", surf: "सर्फ", excel: "एक्सेल", nirma: "निरमा", wheel: "व्हील", tide: "टाइड",
  rin: "रिन", ariel: "एरियल", lux: "लक्स", lifebuoy: "लाइफबॉय", dettol: "डेटॉल", colgate: "कोलगेट",
  pepsodent: "पेप्सोडेंट", closeup: "क्लोज़अप", vim: "विम", harpic: "हार्पिक", lizol: "लाइज़ोल",
  marie: "मैरी", bourbon: "बॉर्बन", kissan: "किसान", rajdhani: "राजधानी", kurkure: "कुरकुरे", lays: "लेज़",
  bru: "ब्रू", nescafe: "नेस्कैफ़े", horlicks: "हॉर्लिक्स", bournvita: "बॉर्नविटा", taj: "ताज", mahal: "महल",
  brooke: "ब्रुक", bond: "बॉन्ड", wagh: "वाघ", bakri: "बकरी", society: "सोसाइटी", label: "लेबल",
  goodday: "गुड डे", sunfeast: "सनफीस्ट", bingo: "बिंगो", dalda: "डालडा", gemini: "जेमिनी",
  engine: "इंजन", shakti: "शक्ति", ponds: "पॉन्ड्स", vaseline: "वैसलीन", parachute: "पैराशूट",
  clinic: "क्लिनिक", plus: "प्लस", head: "हेड", shoulders: "शोल्डर्स", santoor: "संतूर", cinthol: "सिंथॉल",
  godrej: "गोदरेज", nivea: "निविया", boroplus: "बोरोप्लस", fevicol: "फेविकोल", mortein: "मॉर्टिन",
  goodknight: "गुडनाइट", allout: "ऑलआउट", odonil: "ओडोनिल", rasna: "रसना", tang: "टैंग", frooti: "फ्रूटी",
  maaza: "माज़ा", pepsi: "पेप्सी", coke: "कोक", sprite: "स्प्राइट", thums: "थम्स", up: "अप", limca: "लिम्का",
  bisleri: "बिसलेरी", kinley: "किनले",
};

// Units that only count as units right after a number ("500g", "1 l").
const SHORT_UNITS: Record<string, string> = { g: "ग्राम", l: "लीटर" };

// Single letters are read out as English letter names ("Parle-G" → "पारले-जी").
const LETTERS: Record<string, string> = {
  a: "ए", b: "बी", c: "सी", d: "डी", e: "ई", f: "एफ", g: "जी", h: "एच", i: "आई", j: "जे", k: "के", l: "एल", m: "एम",
  n: "एन", o: "ओ", p: "पी", q: "क्यू", r: "आर", s: "एस", t: "टी", u: "यू", v: "वी", w: "डब्ल्यू", x: "एक्स", y: "वाई", z: "ज़ेड",
};

// ---------- phonetic Latin → Devanagari ----------

const VOWELS: [string, string, string][] = [
  // [latin, independent, matra]
  ["iya", "इया", "िया"], ["ia", "इया", "िया"], ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ou", "औ", "ौ"], ["ee", "ई", "ी"], ["ii", "ई", "ी"],
  ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"], ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"], ["o", "ओ", "ो"],
];

const CONSONANTS: [string, string][] = [
  ["chh", "छ"], ["ksh", "क्ष"], ["tr", "त्र"], ["kh", "ख"], ["gh", "घ"], ["ch", "च"], ["jh", "झ"], ["th", "थ"], ["dh", "ध"],
  ["ph", "फ"], ["bh", "भ"], ["sh", "श"], ["k", "क"], ["c", "क"], ["q", "क"], ["g", "ग"], ["j", "ज"], ["t", "ट"],
  ["d", "द"], ["n", "न"], ["p", "प"], ["f", "फ़"], ["b", "ब"], ["m", "म"], ["y", "य"], ["r", "र"], ["l", "ल"],
  ["v", "व"], ["w", "व"], ["s", "स"], ["h", "ह"], ["z", "ज़"], ["x", "क्स"],
];

const HALANT = "्";

function matchAt<T extends [string, ...string[]]>(word: string, i: number, table: T[]): T | null {
  for (const row of table) if (word.startsWith(row[0], i)) return row;
  return null;
}

/** Phonetic Devanagari spelling of one Latin word (Hinglish-style). */
export function transliterate(word: string): string {
  const w = word.toLowerCase();
  let out = "";
  let prevConsonant = false;
  let i = 0;
  while (i < w.length) {
    const v = matchAt(w, i, VOWELS);
    if (v) {
      const atEnd = i + v[0].length === w.length;
      if (prevConsonant) {
        // Word-final "a"/"i" after a consonant is usually long in names: Tata → टाटा, Haldi → हल्दी.
        if (atEnd && v[0] === "a" && w.length > 2) out += "ा";
        else if (atEnd && v[0] === "i") out += "ी";
        else out += v[2];
      } else out += v[1];
      prevConsonant = false;
      i += v[0].length;
      continue;
    }
    const c = matchAt(w, i, CONSONANTS);
    if (c) {
      const next = i + c[0].length;
      // "n"/"m" before another consonant becomes anusvara: Ganga → गंगा.
      const following = matchAt(w, next, CONSONANTS);
      if ((c[0] === "n" || c[0] === "m") && !prevConsonant && following && !["y", "r", "l", "v", "w", "h", "s", "sh"].includes(following[0])) {
        out += "ं";
        i = next;
        prevConsonant = false;
        continue;
      }
      if (prevConsonant) out += HALANT;
      out += c[1];
      prevConsonant = true;
      i = next;
      continue;
    }
    out += w[i]; // digits, punctuation
    prevConsonant = false;
    i++;
  }
  return out;
}

function translateWord(token: string): string {
  const lower = token.toLowerCase();
  if (WORDS[lower]) return WORDS[lower];
  if (LETTERS[lower]) return LETTERS[lower];
  // "500g", "1kg", "2ltr" → number + unit
  const m = lower.match(/^(\d+(?:\.\d+)?)([a-z]+)$/);
  if (m && (WORDS[m[2]] || SHORT_UNITS[m[2]])) return `${m[1]} ${WORDS[m[2]] ?? SHORT_UNITS[m[2]]}`;
  if (/^[a-z]+$/.test(lower)) return transliterate(lower);
  return token;
}

/** Hindi name suggestion for an English product name. */
export function toHindi(english: string): string {
  const text = english.trim().replace(/\s+/g, " ");
  if (!text) return "";
  // Split into words while keeping separators like "-", "(", "/".
  const parts = text.split(/([\s\-()/,&+]+)/);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p || /^[\s\-()/,&+]+$/.test(p)) {
      out.push(p);
      continue;
    }
    // Try a two-word phrase first ("red chilli").
    if (i + 2 < parts.length && /^\s+$/.test(parts[i + 1])) {
      const phrase = `${p} ${parts[i + 2]}`.toLowerCase();
      if (PHRASES[phrase]) {
        out.push(PHRASES[phrase]);
        i += 2;
        continue;
      }
    }
    const prevWord = parts[i - 2];
    if (SHORT_UNITS[p.toLowerCase()] && prevWord && /^\d+(\.\d+)?$/.test(prevWord)) out.push(SHORT_UNITS[p.toLowerCase()]);
    else out.push(translateWord(p));
  }
  return out.join("");
}
