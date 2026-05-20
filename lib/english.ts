const stopwords = new Set([
  'church', 'ministry', 'fellowship', 'evangelical', 'international',
  'center', 'ministries', 'gospel', 'the', 'of', 'and', 'in', 'at', 'assembly', 'assemblies',
  'congregation', 'parish', 'a', 'an', 'inc', 'ltd', 'global', 'mission',
  'north', 'south', 'east', 'west'
]);

const englishSynonyms: Record<string, string> = {
  'mkc': 'meserete kristos',
  'qhc': 'kale heywet',
  'ekhc': 'kale heywet',
  'eotc': 'orthodox',
  'full gospel': 'mulu wongel',
  'hiwot': 'heywet',
  'hiwet': 'heywet',
  'eecmy': 'mekane yesus'
};

export function normalizeEnglish(text: string): string {
  if (!text) return '';
  // 1. Lowercase
  let n = text.toLowerCase();
  
  // 2. Strip punctuation entirely (except spaces)
  n = n.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  
  // 3. Remove extra spaces
  n = n.replace(/\s+/g, ' ').trim();

  // Apply english synonyms
  for (const [key, val] of Object.entries(englishSynonyms)) {
    if (n.includes(key)) {
      n = n.split(key).join(val);
    }
  }
  
  // 4. Stopword removal
  const words = n.split(' ').filter(w => !stopwords.has(w));
  
  return words.join(' ');
}
