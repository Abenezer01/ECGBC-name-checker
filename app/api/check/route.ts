import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { normalizeAmharic, transliterateAmharic } from '@/lib/amharic';
import { levenshteinSimilarity, tokenJaccardSimilarity, getTrigrams } from '@/lib/similarity';

export const dynamic = 'force-dynamic';

// A simple English normalizer
function normalizeEnglish(text: string): string {
  if (!text) return '';
  const stopwords = new Set(['church', 'ministry', 'fellowship', 'evangelical', 'international', 'center', 'ministries', 'gospel', 'the', 'of', 'and', 'in', 'at']);
  let n = text.toLowerCase();
  n = n.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n.split(' ').filter(w => !stopwords.has(w)).join(' ');
}

function calculateScore(masterCandidate: any, aNorm: any) {
  const masterAm = masterCandidate.normalizedAm;
  const masterEn = masterCandidate.normalizedEn;
  const masterTranslit = transliterateAmharic(masterAm);
  
  const appAm = aNorm.normalizedAm;
  const appEn = aNorm.normalizedEn;
  const appTranslit = transliterateAmharic(appAm);

  const strSimAm = appAm && masterAm ? levenshteinSimilarity(appAm, masterAm) : 0;
  const strSimEn = appEn && masterEn ? levenshteinSimilarity(appEn, masterEn) : 0;
  const bestStrSim = Math.max(strSimAm, strSimEn);

  const tokenSimAm = appAm && masterAm ? tokenJaccardSimilarity(appAm, masterAm) : 0;
  const tokenSimEn = appEn && masterEn ? tokenJaccardSimilarity(appEn, masterEn) : 0;
  const bestTokenSim = Math.max(tokenSimAm, tokenSimEn);

  const translitSim = appTranslit && masterTranslit ? levenshteinSimilarity(appTranslit, masterTranslit) : 0;

  const finalScore = (bestStrSim * 0.55) + (bestTokenSim * 0.25) + (translitSim * 0.20);
  return { finalScore, masterAm, masterEn, strSimAm };
}

export async function POST(req: NextRequest) {
  try {
    const { name, category } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!category || !['church', 'ministry'].includes(category)) {
      return NextResponse.json({ error: 'Valid category (church or ministry) is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    
    // Fetch all for the category - normally we limit this but our dataset is small (<5000)
    // We only select needed columns to minimize memory
    const { data: allData, error } = await supabase
      .from('organizations')
      .select('id, church_name, certificate_no, type')
      .limit(10000); // safety cap

    if (error) {
       console.error("Supabase search error:", error);
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let exactMatchFound = false;
    let finalCandidates: any[] = [];

    if (allData && allData.length > 0) {
         // Perform similarity matching
         const aNormAm = normalizeAmharic(name);
         const aNormEn = normalizeEnglish(name);
         const aNorm = {
             normalizedAm: aNormAm,
             normalizedEn: aNormEn,
             trigrams: getTrigrams(aNormAm).concat(getTrigrams(aNormEn))
         };

         let candidateScores = [];

         for (const m of allData) {
           const normalizedAm = normalizeAmharic(m.church_name || '');
           const normalizedEn = normalizeEnglish(m.church_name || '');
           const masterCandidate = {
              ...m,
              normalizedAm,
              normalizedEn,
           };
           
           const isRawMatch = m.church_name?.trim().toLowerCase() === name.trim().toLowerCase();
           const isNormalizedMatch = masterCandidate.normalizedAm && masterCandidate.normalizedAm === aNorm.normalizedAm;
           const isEnglishMatch = masterCandidate.normalizedEn && aNorm.normalizedEn && masterCandidate.normalizedEn === aNorm.normalizedEn;
           const isCurrentExactMatch = isRawMatch || isNormalizedMatch || isEnglishMatch;

           if (isCurrentExactMatch) {
             exactMatchFound = true;
           }

           const result = calculateScore(masterCandidate, aNorm);
           const finalScore = isCurrentExactMatch ? 100 : result.finalScore;

           if (finalScore > 60) {
             candidateScores.push({
                score: finalScore,
                candidate: m
             });
           }
         }

         candidateScores.sort((a, b) => b.score - a.score);

         if (candidateScores.length > 0 && candidateScores[0].score >= 90) {
            exactMatchFound = true; // functionally equivalent to an exact match
         }

         finalCandidates = candidateScores.slice(0, 5).map(c => ({
            id: c.candidate.id,
            nameAm: c.candidate.church_name,
            nameEn: '',
            registrationId: c.candidate.certificate_no,
            status: c.score >= 90 ? 'High Similarity' : 'Similar'
         }));
    }

    return NextResponse.json({
      success: true,
      query: { name, category },
      exactMatchFound,
      candidates: finalCandidates
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
