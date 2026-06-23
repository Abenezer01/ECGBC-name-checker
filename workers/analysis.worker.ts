// This file will contain worker code that we inject via Blob URL dynamically 
// due to Next.js limitations with standalone standard workers unless heavily configured.
// It uses pure functions from our other files. In production, tools like Webpack handle this, 
// but strings are reliable for standalone drop-ins.

export const analysisWorkerScript = `
self.onmessage = function(e) {
  const { master, applicants } = e.data;
  
  // Progress tracking helper
  let processed = 0;
  const total = applicants.length;
  
  function reportProgress() {
    if (processed % 100 === 0 || processed === total) {
      self.postMessage({ type: 'progress', progress: (processed / total) * 100 });
    }
  }

  // --- Utility functions mirrored into the worker (to keep it completely standalone) ---
  const stopwords = new Set([
    'church', 'ministry', 'fellowship', 'evangelical', 'international', 'center', 
    'ministries', 'gospel', 'the', 'of', 'and', 'in', 'at', 'assembly', 'assemblies',
    'congregation', 'parish', 'a', 'an', 'inc', 'ltd', 'global', 'mission',
    'north', 'south', 'east', 'west'
  ]);

  const englishSynonyms = {
    'mkc': 'meserete kristos',
    'qhc': 'kale heywet',
    'ekhc': 'kale heywet',
    'eotc': 'orthodox',
    'full gospel': 'mulu wongel',
    'hiwot': 'heywet',
    'hiwet': 'heywet',
    'eecmy': 'mekane yesus'
  };

  function normalizeEnglish(text) {
    if (!text) return '';
    let n = text.toLowerCase();
    n = n.replace(/[.,\\/#!$%\\^&\\*;:{}=\\-_~()]/g, ' ');
    n = n.replace(/\\s+/g, ' ').trim();

    for (const [key, val] of Object.entries(englishSynonyms)) {
      if (n.includes(key)) {
        n = n.split(key).join(val);
      }
    }
    
    return n.split(' ').filter(w => !stopwords.has(w)).join(' ');
  }

  const amharicStopwords = new Set([
    'ቤተክርስቲያን',
    'ቤተ',
    'ክርስቲያን',
    'ወንጌላዊት',
    'አጥቢያ',
    'ሚኒስትሪ',
    'ማህበር',
    'አገልግሎት',
    'ዓለም',
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
    'መካነ',
    'ኢየሱስ',
    'ፕሮቴስታንት',
    'ካቶሊክ',
    'ኦርቶዶክስ',
    'ቸርች',
    'ችርች',
    'ወረዳ',
    'ክፍለ',
    'ከተማ',
    'ቀበሌ',
    'ዘ',   // 'the' transliterated
    'ኦፍ'   // 'of' transliterated
  ]);

  const amharicSynonyms = {
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

  function normalizeAmharic(text) {
    if (!text) return '';
    let n = text.replace(/[\\s_]+/g, ' ').trim();
    const map = {
      'ሐ': 'ሀ', 'ሑ': 'ሁ', 'ሒ': 'ሂ', 'ሓ': 'ሃ', 'ሔ': 'ሄ', 'ሕ': 'ህ', 'ሖ': 'ሆ',
      'ኀ': 'ሀ', 'ኁ': 'ሁ', 'ኂ': 'ሂ', 'ኃ': 'ሃ', 'ኄ': 'ሄ', 'ኅ': 'ህ', 'ኆ': 'ሆ',
      'ኻ': 'ሀ', 'ⵅ': 'ህ', 'ሠ': 'ሰ', 'ሡ': 'ሱ', 'ሢ': 'ሲ', 'ሣ': 'ሳ', 'ሤ': 'ሴ', 
      'ሥ': 'ስ', 'ሦ': 'ሶ', 'ፀ': 'ጸ', 'ፁ': 'ጹ', 'ፂ': 'ጺ', 'ፃ': 'ጻ', 'ፄ': 'ጼ', 
      'ፅ': 'ጽ', 'ፆ': 'ጾ', 'ዐ': 'አ', 'ዑ': 'ኡ', 'ዒ': 'ኢ', 'ዓ': 'ኣ', 'ዔ': 'ኤ', 
      'ዕ': 'እ', 'ዖ': 'ኦ'
    };
    n = n.replace(/[፡፤፥-፧፨\\.,!\\?]/g, ' ');
    n = n.split('').map(c => map[c] || c).join('');
    
    // Apply synonym replacements
    for (const [key, val] of Object.entries(amharicSynonyms)) {
      if (n.includes(key)) {
        n = n.split(key).join(val);
      }
    }
    
    n = n.split(/\\s+/).filter(w => !amharicStopwords.has(w)).join(' ');
    
    return n.replace(/\\s+/g, ' ').trim();
  }

  const amharicToLatinMap = {
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

  function transliterateAmharic(text) {
    if (!text) return '';
    let latin = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        latin += amharicToLatinMap[char] || char;
    }
    return latin;
  }

  function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= a.length; i++) matrix[i] = [i];
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  function levenshteinSimilarity(a, b) {
    if (!a && !b) return 100;
    if (!a || !b) return 0;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return Math.max(0, (1 - dist / maxLen) * 100);
  }

  function tokenJaccardSimilarity(s1, s2) {
    const set1 = new Set(s1.split(' ').filter(Boolean));
    const set2 = new Set(s2.split(' ').filter(Boolean));
    if (set1.size === 0 && set2.size === 0) return 100;
    if (set1.size === 0 || set2.size === 0) return 0;

    let intersection = 0;
    for (const token of set1) {
      if (set2.has(token)) intersection++;
    }
    const union = set1.size + set2.size - intersection;
    return (intersection / union) * 100;
  }

  function tokenSubsetSimilarity(s1, s2) {
    const set1 = new Set(s1.split(' ').filter(Boolean));
    const set2 = new Set(s2.split(' ').filter(Boolean));
    if (set1.size === 0 && set2.size === 0) return 100;
    if (set1.size === 0 || set2.size === 0) return 0;

    let intersection = 0;
    for (const token of set1) {
      if (set2.has(token)) intersection++;
    }
    const minSize = Math.min(set1.size, set2.size);
    return (intersection / minSize) * 100;
  }

  function getTrigrams(str) {
    if (!str) return [];
    const s = "__" + str.replace(/\\s+/g, "_") + "__";
    const result = [];
    for (let i = 0; i < s.length - 2; i++) {
        result.push(s.slice(i, i + 3));
    }
    return result;
  }

  function trigramDiceSimilarity(t1, t2) {
    if (!t1 || !t2 || t1.length === 0 || t2.length === 0) return 0;
    
    let intersection = 0;
    let t2Copy = [...t2];
    for (let i = 0; i < t1.length; i++) {
       const idx = t2Copy.indexOf(t1[i]);
       if (idx !== -1) {
          intersection++;
          t2Copy.splice(idx, 1);
       }
    }
    return (2 * intersection / (t1.length + t2.length)) * 100;
  }

  function calculateScore(m, a) {
     // Combine Amharic and English fields for total string representations
     // Use English transliteration if present
     const masterAm = m.normalizedAm;
     const masterEn = m.normalizedEn;
     const masterTranslit = transliterateAmharic(masterAm || '');
     
     const appAm = a.normalizedAm;
     const appEn = a.normalizedEn;
     const appTranslit = transliterateAmharic(appAm || '');

     const strSimAm = appAm && masterAm ? levenshteinSimilarity(appAm, masterAm) : 0;
     const strSimEn = appEn && masterEn ? levenshteinSimilarity(appEn, masterEn) : 0;
     const bestStrSim = Math.max(strSimAm, strSimEn);

     const tokenSimAm = appAm && masterAm ? tokenJaccardSimilarity(appAm, masterAm) : 0;
     const tokenSimEn = appEn && masterEn ? tokenJaccardSimilarity(appEn, masterEn) : 0;
     const bestTokenSim = Math.max(tokenSimAm, tokenSimEn);

     const subsetSimAm = appAm && masterAm ? tokenSubsetSimilarity(appAm, masterAm) : 0;
     const subsetSimEn = appEn && masterEn ? tokenSubsetSimilarity(appEn, masterEn) : 0;
     const bestSubsetSim = Math.max(subsetSimAm, subsetSimEn);

     const tgSimAm = appAm && masterAm ? trigramDiceSimilarity(getTrigrams(appAm), getTrigrams(masterAm)) : 0;
     const tgSimEn = appEn && masterEn ? trigramDiceSimilarity(getTrigrams(appEn), getTrigrams(masterEn)) : 0;
     const bestTgSim = Math.max(tgSimAm, tgSimEn);

     // Cross-lingual match: compare Amharic transliteration to English text
     const translitSimAm2Am = appTranslit && masterTranslit ? levenshteinSimilarity(appTranslit, masterTranslit) : 0;
     const translitSimAm2En = appTranslit && masterEn ? levenshteinSimilarity(appTranslit, masterEn) : 0;
     const translitSimEn2Am = appEn && masterTranslit ? levenshteinSimilarity(appEn, masterTranslit) : 0;
     const bestTranslitSim = Math.max(translitSimAm2Am, translitSimAm2En, translitSimEn2Am);

     // Trigrams cross-lingual
     const tgTranslitAm2En = appTranslit && masterEn ? trigramDiceSimilarity(getTrigrams(appTranslit), getTrigrams(masterEn)) : 0;
     const tgTranslitEn2Am = appEn && masterTranslit ? trigramDiceSimilarity(getTrigrams(appEn), getTrigrams(masterTranslit)) : 0;
     const tgTranslitAm2Am = appTranslit && masterTranslit ? trigramDiceSimilarity(getTrigrams(appTranslit), getTrigrams(masterTranslit)) : 0;
     const bestTgTranslitSim = Math.max(tgTranslitAm2En, tgTranslitEn2Am, tgTranslitAm2Am);

     const ruleFlags = [];

     // 1. Exact Match Rule
     if (bestStrSim === 100) {
       ruleFlags.push("Exact match (+)");
       return { finalScore: 100, masterAm, masterEn, strSimAm, ruleFlags };
     }

     // 2. Transposed/Reordered Exact Match
     // If strings aren't exact match but their token sets are 100% identical
     if (bestTokenSim === 100) {
       ruleFlags.push("Tokens reordered (+)");
       return { finalScore: 98, masterAm, masterEn, strSimAm, ruleFlags }; // Almost exact match
     }

     // 3. Base blended score
     // If token similarity is high, trust it more than Levenshtein to handle reordered words better
     let finalScore = Math.max(
         bestTgSim * 0.90, 
         bestTokenSim > bestStrSim 
            ? (bestTokenSim * 0.70) + (bestStrSim * 0.20)
            : (bestStrSim * 0.55) + (bestTokenSim * 0.35)
     );
     
     // Incorporate cross-lingual transliteration matches if they are stronger than the direct matches
     if (bestTranslitSim > finalScore || bestTgTranslitSim > finalScore) {
         const translitBlendedScore = Math.max(bestTgTranslitSim * 0.90, bestTranslitSim * 0.85);
         finalScore = Math.max(finalScore, translitBlendedScore);
         if (translitBlendedScore >= 80 && ruleFlags.length === 0) {
             ruleFlags.push("Cross-lingual translation match");
         }
     }

     if (bestTgSim >= 85 && bestTokenSim < 100) {
         ruleFlags.push("Trigram overlap (" + bestTgSim.toFixed(0) + "%)");
         finalScore = Math.max(finalScore, bestTgSim);
     }

     // Check Subset Match
     if (bestSubsetSim === 100 && bestTokenSim < 100) {
         ruleFlags.push("Subset match (+)");
         finalScore = Math.max(finalScore, 85); // High baseline for full subset matching
     }

     // 4. Acronym Match Rule
     // If one name is a short acronym of the other in either Amharic or English
     const checkAcronym = (shortStr, longStr) => {
       if (!shortStr || !longStr || shortStr.length < 2 || shortStr.length > 5) return false;
       const tokens = longStr.split(' ').filter(Boolean);
       if (tokens.length >= 2 && tokens.length === shortStr.length) {
         const generatedAcronym = tokens.map(t => t[0]).join('');
         if (generatedAcronym === shortStr) return true;
       }
       return false;
     };

     const isAmharicAcronym = checkAcronym(appAm, masterAm) || checkAcronym(masterAm, appAm);
     const isEnglishAcronym = checkAcronym(appEn, masterEn) || checkAcronym(masterEn, appEn);

     if (isAmharicAcronym || isEnglishAcronym) {
       finalScore = Math.max(finalScore, 95); // High confidence match
       ruleFlags.push("Acronym match (+)");
     }

     // 5. Prefix/Suffix Penalty (Token length mismatch could indicate an entirely different church)
     const mTokens = masterAm.split(' ').length;
     const aTokens = appAm.split(' ').length;
     if (Math.abs(mTokens - aTokens) > 2) {
       finalScore *= 0.8; // Penalty for large length difference
       ruleFlags.push("Length mismatch (-20%)");
     }

     // 6. Location Bonus / Penalty — removed, city is no longer used in scoring

     // 7. Branch / Affiliate Detection
     // Check if raw names contain "branch", "ቅርንጫፍ", etc. to flag affiliated vs duplicate
     const branchIndicatorsEn = ['branch', 'local', 'parish'];
     const branchIndicatorsAm = ['ቅርንጫፍ', 'አጥቢያ', 'ወረዳ', 'ቀበሌ', 'ክፍለ ከተማ'];
     
     const mRawStr = (m.church_name || '').toLowerCase();
     const aRawStr = (a.church_name || '').toLowerCase();
     // If strings are very similar but one is explicitly a branch of the other
     if (finalScore > 70) {
       const mHasBranch = branchIndicatorsEn.some(w => mRawStr.includes(w)) || branchIndicatorsAm.some(w => mRawStr.includes(w));
       const aHasBranch = branchIndicatorsEn.some(w => aRawStr.includes(w)) || branchIndicatorsAm.some(w => aRawStr.includes(w));
       
       if (mHasBranch !== aHasBranch) {
         ruleFlags.push("Branch / Parent relationship (Affiliate)");
         finalScore *= 0.90;
       } else if (mHasBranch && aHasBranch) {
         ruleFlags.push("Different branches");
         finalScore *= 0.75;
       }
     }

     // 8. Category/Type Cross-Match Penalty
     const mType = m.type || m.category || '';
     const aType = a.type || a.category || '';
     if (mType && aType) {
       const mTypeStr = mType.toLowerCase();
       const aTypeStr = aType.toLowerCase();
       const mIsChurch = mTypeStr.includes('church') || mTypeStr.includes('ቤ/ክ');
       const mIsMinistry = mTypeStr.includes('ministry') || mTypeStr.includes('ሚኒስትሪ') || mTypeStr.includes('አገልግሎት');
       const aIsChurch = aTypeStr.includes('church') || aTypeStr.includes('ቤ/ክ');
       const aIsMinistry = aTypeStr.includes('ministry') || aTypeStr.includes('ሚኒስትሪ') || aTypeStr.includes('አገልግሎት');
       
       if ((mIsChurch && aIsMinistry) || (mIsMinistry && aIsChurch)) {
         finalScore *= 0.70; // Penalize significantly if one is explicitly a church and the other is explicitly a ministry
         ruleFlags.push("Type mismatch (-30%)");
       }
     }

     return { finalScore, masterAm, masterEn, strSimAm, ruleFlags };
  }

  self.postMessage({ type: 'progress', progress: 0, status: 'Normalizing Master Registry...' });

  // 1. Pre-process Master Registry
  const mNorm = master.map((m) => {
      const normalizedAm = normalizeAmharic(m.church_name || '');
      const normalizedEn = normalizeEnglish(m.church_name || '');
      return {
          ...m,
          normalizedAm,
          normalizedEn,
          trigrams: getTrigrams(normalizedAm).concat(getTrigrams(normalizedEn))
      };
  });

  self.postMessage({ type: 'progress', progress: 0, status: 'Building Trigram Index for Performance...' });

  // 2. Build Trigram Index for Master
  const invertedIndex = new Map();
  for(let i=0; i<mNorm.length; i++) {
      const tgs = mNorm[i].trigrams;
      const seen = new Set(); // Prevent assigning same row multiple times per trigram
      for(let j=0; j<tgs.length; j++) {
         const t = tgs[j];
         if(!seen.has(t)){
            seen.add(t);
            let arr = invertedIndex.get(t);
            if(!arr) {
               arr = [];
               invertedIndex.set(t, arr);
            }
            arr.push(i);
         }
      }
  }

  const totalDocs = Math.max(1, mNorm.length);
  const idf = new Map();
  for (const [t, arr] of invertedIndex.entries()) {
      idf.set(t, Math.log10(totalDocs / arr.length));
  }

  self.postMessage({ type: 'progress', progress: 0, status: 'Analyzing Applicants...' });

  const results = [];
  
  // 3. Process Applicants
  for(let i=0; i<applicants.length; i++) {
      const a = applicants[i];
      const aNormAm = normalizeAmharic(a.church_name_am || a.church_name || '');
      const aNormEn = normalizeEnglish(a.church_name_en || a.church_name || '');
      const aNorm = {
          ...a,
          normalizedAm: aNormAm,
          normalizedEn: aNormEn,
          trigrams: getTrigrams(aNormAm).concat(getTrigrams(aNormEn))
      };

      // Filter candidates using index (count matching trigrams heavily weighted by TF-IDF)
      const candidateDocs = new Map();
      const aTgs = aNorm.trigrams;
      
      for(let j=0; j<aTgs.length; j++) {
         const t = aTgs[j];
         const ids = invertedIndex.get(t);
         if(ids) {
            const weight = idf.get(t) || 1;
            for(let k=0; k<ids.length; k++) {
               const id = ids[k];
               candidateDocs.set(id, (candidateDocs.get(id) || 0) + weight);
            }
         }
      }

      // Sort candidate Docs by shared trigrams and take Top 50
      const sortedCandidates = Array.from(candidateDocs.entries())
                                    .sort((c1, c2) => c2[1] - c1[1])
                                    .slice(0, 50)
                                    .map(c => c[0]);

      // Use a broader search if no trigram match
      const candidatesToScan = sortedCandidates.length > 0 ? sortedCandidates : Array.from({length: Math.min(100, mNorm.length)}, (_, i) => i);

      let candidateScores = [];

      // Heavy comparison on candidates
      for(let j=0; j<candidatesToScan.length; j++) {
          const mIdx = candidatesToScan[j];
          const masterCandidate = mNorm[mIdx];
          
          const result = calculateScore(masterCandidate, aNorm);
          candidateScores.push({
             score: result.finalScore,
             candidate: masterCandidate,
             ruleFlags: result.ruleFlags
          });
      }

      candidateScores.sort((a, b) => b.score - a.score);

      let bestScore = 0;
      let bestMatch = null;
      let closeMatches = [];

      if (candidateScores.length > 0) {
          bestScore = candidateScores[0].score;
          bestMatch = candidateScores[0].candidate;
          
          closeMatches = candidateScores.slice(0, 5).map(c => ({
              matchAm: c.candidate.church_name || '',
              matchEn: '',
              registrationId: c.candidate.certificate_no || 'N/A',
              score: c.score,
              ruleFlags: c.ruleFlags
          }));
      }

      let matchType = 'Unique';
      if (bestScore >= 90) matchType = 'Likey Duplicate';
      else if (bestScore >= 75) matchType = 'Needs Manual Review';

      results.push({
         id: i.toString() + '_' + Date.now(),
         submittedName: a.church_name_am || a.church_name_en || a.church_name || 'Unknown',
         closestMatchAm: bestMatch ? bestMatch.church_name : '',
         closestMatchEn: '',
         similarity: bestScore,
         matchType,
         registrationId: bestMatch ? bestMatch.certificate_no : 'N/A',
         action: 'Pending',
         applicantName: a.applicant_name,
         submittedAt: a.submitted_at,
         closeMatches: closeMatches
      });

      processed++;
      reportProgress();
  }

  self.postMessage({ type: 'complete', results });
};
`;

export function runAnalysisWorker(
  master: any[], 
  applicants: any[], 
  onProgress: (p: number, s?: string) => void
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([analysisWorkerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    
    worker.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'progress') {
        onProgress(data.progress, data.status);
      } else if (data.type === 'complete') {
        resolve(data.results);
        worker.terminate();
        URL.revokeObjectURL(url);
      }
    };
    
    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    worker.postMessage({ master, applicants });
  });
}
