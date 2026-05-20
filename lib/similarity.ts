// Helper functions for fuzzy matching strings

export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

export function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, (1 - dist / maxLen) * 100);
}

export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;

  let m = 0;
  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      m++;
      break;
    }
  }

  if (m === 0) return 0;

  let k = 0;
  let numTransposes = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) numTransposes++;
    k++;
  }

  const weight = (m / s1.length + m / s2.length + (m - numTransposes / 2) / m) / 3;
  
  // Winkler modification: boost based on prefix match
  let l = 0;
  const p = 0.1;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) l++;
    else break;
  }

  const finalWeight = weight + l * p * (1 - weight);
  return finalWeight * 100;
}

export function tokenJaccardSimilarity(s1: string, s2: string): number {
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

// Generate Trigrams for fast inverted index search
export function getTrigrams(str: string): string[] {
  if (!str) return [];
  const s = `__${str}__`.replace(/\s+/g, '_');
  const result = [];
  for (let i = 0; i < s.length - 2; i++) {
    result.push(s.slice(i, i + 3));
  }
  return result;
}
