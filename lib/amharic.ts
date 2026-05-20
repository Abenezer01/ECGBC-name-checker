const amharicStopwords = new Set([
  'ቤተክርስቲያን',
  'ቤተ',
  'ክርስቲያን',
  'ወንጌላዊት',
  'አጥቢያ',
  'ሚኒስትሪ',
  'ሚኒስትሪስ',
  'ሚንስትሪ',
  'ማህበር',
  'አገልግሎት',
  'ዓለም',
  'አለም',
  'አቀፍ',
  'ኢንተርናሽናል',
  'ሙሉ',
  'ወንጌል',
  'አማኞች',
  'እምነት',
  'ቤ/ክ',
  'ቤ/ክርስቲያን',
  'የ',
  'እና',
  'በ',
  'ከ',
  'ት/ቤት',
  'ማዕከል',
  'ማእከል',
  'መካነ',
  'ኢየሱስ',
  'እየሱስ',
  'ፕሮቴስታንት',
  'ካቶሊክ',
  'ኦርቶዶክስ',
  'ቸርች',
  'ችርች',
  'ወረዳ',
  'ክፍለ',
  'ከተማ',
  'ቀበሌ',
  'ዘ',
  'ኦፍ'
]);

const amharicSynonyms: Record<string, string> = {
  'መ ክ አ': 'መሰረተ ክርስቶስ',
  'መክአ': 'መሰረተ ክርስቶስ',
  'ቃ ሕ ቤ': 'ቃለ ህይወት',
  'ቃሕቤ': 'ቃለ ህይወት',
  'ሙሉወንጌል': 'ሙሉ ወንጌል',
  'ሙ ወ': 'ሙሉ ወንጌል',
  'ሕይወት': 'ህይወት',
  'ብርሃን': 'ብርሀን',
  'ሐዋርያት': 'ሀዋርያት',
  'ሐዋርያዊት': 'ሀዋርያዊት',
};

export function normalizeAmharic(text: string): string {
  if (!text) return '';
  let n = text.replace(/[\s_]+/g, ' ').trim();
  
  // Normalize variations of letters
  const map: Record<string, string> = {
    // Ha variations
    'ሐ': 'ሀ', 'ሑ': 'ሁ', 'ሒ': 'ሂ', 'ሓ': 'ሃ', 'ሔ': 'ሄ', 'ሕ': 'ህ', 'ሖ': 'ሆ',
    'ኀ': 'ሀ', 'ኁ': 'ሁ', 'ኂ': 'ሂ', 'ኃ': 'ሃ', 'ኄ': 'ሄ', 'ኅ': 'ህ', 'ኆ': 'ሆ',
    'ኻ': 'ሀ', 'ⵅ': 'ህ',
    // Sa variations
    'ሠ': 'ሰ', 'ሡ': 'ሱ', 'ሢ': 'ሲ', 'ሣ': 'ሳ', 'ሤ': 'ሴ', 'ሥ': 'ስ', 'ሦ': 'ሶ',
    // Tse variations
    'ፀ': 'ጸ', 'ፁ': 'ጹ', 'ፂ': 'ጺ', 'ፃ': 'ጻ', 'ፄ': 'ጼ', 'ፅ': 'ጽ', 'ፆ': 'ጾ',
    // A variations (map 'ዐ' class to 'አ' equivalent, and also handling 4th order confusion occasionally but sticking to sound matching)
    'ዐ': 'አ', 'ዑ': 'ኡ', 'ዒ': 'ኢ', 'ዓ': 'ኣ', 'ዔ': 'ኤ', 'ዕ': 'እ', 'ዖ': 'ኦ',
    // Often confused combinations
    'ዉ': 'ው',
    'ዪ': 'ይ',
  };
  
  // Punctuation characters to remove, robustly
  // Ethiopic wordspace (፡) comma (፣) fullstop (።) etc + ascii punctuation
  n = n.replace(/[፡፤፥-፧፨\.,!\?\/\\(\)\[\]"\'`]/g, ' ');

  // Apply character mapping
  n = n.split('').map(c => map[c] || c).join('');

  // Apply synonyms (handling abbreviations explicitly)
  for (const [key, val] of Object.entries(amharicSynonyms)) {
    if (n.includes(key)) {
      n = n.split(key).join(val);
    }
  }
  
  // Remove stopwords
  n = n.split(/\s+/).filter(w => !amharicStopwords.has(w)).join(' ');
  
  // Remove duplicate spaces again
  n = n.replace(/\s+/g, ' ').trim();
  
  return n;
}

// Basic transliteration
const amharicToLatinMap: Record<string, string> = {
  // Just mapping the most common roots. In a production system, this could be
  // a full 250+ character map.
  'ሀ': 'he', 'ሁ': 'hu', 'ሂ': 'hi', 'ሃ': 'ha', 'ሄ': 'he', 'ህ': 'h', 'ሆ': 'ho',
  'ለ': 'le', 'ሉ': 'lu', 'ሊ': 'li', 'ላ': 'la', 'ሌ': 'le', 'ል': 'l', 'ሎ': 'lo',
  'መ': 'me', 'ሙ': 'mu', 'ሚ': 'mi', 'ማ': 'ma', 'ሜ': 'me', 'ም': 'm', 'ሞ': 'mo',
  'ሰ': 'se', 'ሱ': 'su', 'ሲ': 'si', 'ሳ': 'sa', 'ሴ': 'se', 'ስ': 's', 'ሶ': 'so',
  'ረ': 're', 'ሩ': 'ru', 'ሪ': 'ri', 'ራ': 'ra', 'ሬ': 're', 'ር': 'r', 'ሮ': 'ro',
  'ሸ': 'she', 'ሹ': 'shu', 'ሺ': 'shi', 'ሻ': 'sha', 'ሼ': 'she', 'ሽ': 'sh', 'ሾ': 'sho',
  'ቀ': 'qe', 'ቁ': 'qu', 'ቂ': 'qi', 'ቃ': 'qa', 'ቄ': 'qe', 'ቅ': 'q', 'ቆ': 'qo',
  'በ': 'be', 'ቡ': 'bu', 'ቢ': 'bi', 'ባ': 'ba', 'ቤ': 'be', 'ብ': 'b', 'ቦ': 'bo',
  'ተ': 'te', 'ቱ': 'tu', 'ቲ': 'ti', 'ታ': 'ta', 'ቴ': 'te', 'ት': 't', 'ቶ': 'to',
  'ቸ': 'che', 'ቹ': 'chu', 'ቺ': 'chi', 'ቻ': 'cha', 'ቼ': 'che', 'ች': 'ch', 'ቾ': 'cho',
  'ነ': 'ne', 'ኑ': 'nu', 'ኒ': 'ni', 'ና': 'na', 'ኔ': 'ne', 'ን': 'n', 'ኖ': 'no',
  'ኘ': 'nye', 'ኙ': 'nyu', 'ኚ': 'nyi', 'ኛ': 'nya', 'ኜ': 'nye', 'ኝ': 'ny', 'ኞ': 'nyo',
  'አ': 'e', 'ኡ': 'u', 'ኢ': 'i', 'ኣ': 'a', 'ኤ': 'e', 'እ': 'e', 'ኦ': 'o',
  'ከ': 'ke', 'ኩ': 'ku', 'ኪ': 'ki', 'ካ': 'ka', 'ኬ': 'ke', 'ክ': 'k', 'ኮ': 'ko',
  'ወ': 'we', 'ዉ': 'wu', 'ዊ': 'wi', 'ዋ': 'wa', 'ዌ': 'we', 'ው': 'w', 'ዎ': 'wo',
  'ዘ': 'ze', 'ዙ': 'zu', 'ዚ': 'zi', 'ዛ': 'za', 'ዜ': 'ze', 'ዝ': 'z', 'ዞ': 'zo',
  'የ': 'ye', 'ዩ': 'yu', 'ዪ': 'yi', 'ያ': 'ya', 'ዬ': 'ye', 'ይ': 'y', 'ዮ': 'yo',
  'ደ': 'de', 'ዱ': 'du', 'ዲ': 'di', 'ዳ': 'da', 'ዴ': 'de', 'ድ': 'd', 'ዶ': 'do',
  'ጀ': 'je', 'ጁ': 'ju', 'ጂ': 'ji', 'ጃ': 'ja', 'ጄ': 'je', 'ጅ': 'j', 'ጆ': 'jo',
  'ገ': 'ge', 'ጉ': 'gu', 'ጊ': 'gi', 'ጋ': 'ga', 'ጌ': 'ge', 'ግ': 'g', 'ጎ': 'go',
  'ጠ': 'te', 'ጡ': 'tu', 'ጢ': 'ti', 'ጣ': 'ta', 'ጤ': 'te', 'ጥ': 't', 'ጦ': 'to',
  'ጨ': 'che', 'ጩ': 'chu', 'ጪ': 'chi', 'ጫ': 'cha', 'ጬ': 'che', 'ጭ': 'ch', 'ጮ': 'cho',
  'ጰ': 'pe', 'ጱ': 'pu', 'ጲ': 'pi', 'ጳ': 'pa', 'ጴ': 'pe', 'ጵ': 'p', 'ጶ': 'po',
  'ጸ': 'tse', 'ጹ': 'tsu', 'ጺ': 'tsi', 'ጻ': 'tsa', 'ጼ': 'tse', 'ጽ': 'ts', 'ጾ': 'tso',
  'ፈ': 'fe', 'ፉ': 'fu', 'ፊ': 'fi', 'ፋ': 'fa', 'ፌ': 'fe', 'ፍ': 'f', 'ፎ': 'fo',
  'ፐ': 'pe', 'ፑ': 'pu', 'ፒ': 'pi', 'ፓ': 'pa', 'ፔ': 'pe', 'ፕ': 'p', 'ፖ': 'po',
};

export function transliterateAmharic(text: string): string {
  if (!text) return '';
  let latin = '';
  // Convert each character; if not in map, leave as is (could be space or english character)
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    latin += amharicToLatinMap[char] || char;
  }
  return latin;
}
