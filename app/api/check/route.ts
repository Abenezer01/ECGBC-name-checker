import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { normalizeAmharic, transliterateAmharic } from '@/lib/amharic';
import { levenshteinSimilarity, tokenJaccardSimilarity, getTrigrams, trigramDiceSimilarity, tokenSubsetSimilarity } from '@/lib/similarity';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

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
     // If masterAm has text, we transliterate it to Latin. If not, fallback to empty string.
     const masterTranslit = transliterateAmharic(masterAm || '');
     
     const appAm = aNorm.normalizedAm;
     const appEn = aNorm.normalizedEn;
     // Transliterate app Amharic text to Latin
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

     // 1. Exact Match Rule
     if (bestStrSim === 100) {
       return { finalScore: 100, masterAm, masterEn, strSimAm };
     }

     // 2. Transposed/Reordered Exact Match
     if (bestTokenSim === 100) {
       return { finalScore: 98, masterAm, masterEn, strSimAm }; // Almost exact match
     }

     // 3. Base blended score
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
     }

     if (bestTgSim >= 85 && bestTokenSim < 100) {
         finalScore = Math.max(finalScore, bestTgSim);
     }

     // Check Subset Match
     if (bestSubsetSim === 100 && bestTokenSim < 100) {
         finalScore = Math.max(finalScore, 85); // High baseline for full subset matching
     }

     return { finalScore, masterAm, masterEn, strSimAm };
}

export async function POST(req: NextRequest) {
  try {
    const { name, category } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400, headers: corsHeaders });
    }

    if (!category || !['church', 'ministry'].includes(category)) {
      return NextResponse.json({ error: 'Valid category (church or ministry) is required' }, { status: 400, headers: corsHeaders });
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
       return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
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
    }, { headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
