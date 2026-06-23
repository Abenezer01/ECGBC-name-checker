import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { normalizeAmharic, transliterateAmharic } from '@/lib/amharic';
import { normalizeEnglish } from '@/lib/english';
import {
  levenshteinSimilarity,
  tokenJaccardSimilarity,
  getTrigrams,
  trigramDiceSimilarity,
  tokenSubsetSimilarity,
} from '@/lib/similarity';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NormalizedRecord {
  id: string;
  church_name: string;
  certificate_no: string;
  type: string;
  normalizedAm: string;
  normalizedEn: string;
}

interface NormalizedApplicant {
  church_name: string;
  normalizedAm: string;
  normalizedEn: string;
  type: string;
}

interface ScoreResult {
  finalScore: number;
  ruleFlags: string[];
}

// ─── Scoring — exact copy of the worker's calculateScore ─────────────────────
// The worker is the source of truth. Do not diverge from it.

function calculateScore(master: NormalizedRecord, app: NormalizedApplicant): ScoreResult {
  const masterAm      = master.normalizedAm;
  const masterEn      = master.normalizedEn;
  const masterTranslit = transliterateAmharic(masterAm || '');

  const appAm      = app.normalizedAm;
  const appEn      = app.normalizedEn;
  const appTranslit = transliterateAmharic(appAm || '');

  const ruleFlags: string[] = [];

  const strSimAm    = appAm && masterAm ? levenshteinSimilarity(appAm, masterAm) : 0;
  const strSimEn    = appEn && masterEn ? levenshteinSimilarity(appEn, masterEn) : 0;
  const bestStrSim  = Math.max(strSimAm, strSimEn);

  const tokenSimAm    = appAm && masterAm ? tokenJaccardSimilarity(appAm, masterAm) : 0;
  const tokenSimEn    = appEn && masterEn ? tokenJaccardSimilarity(appEn, masterEn) : 0;
  const bestTokenSim  = Math.max(tokenSimAm, tokenSimEn);

  const subsetSimAm   = appAm && masterAm ? tokenSubsetSimilarity(appAm, masterAm) : 0;
  const subsetSimEn   = appEn && masterEn ? tokenSubsetSimilarity(appEn, masterEn) : 0;
  const bestSubsetSim = Math.max(subsetSimAm, subsetSimEn);

  const tgSimAm   = appAm && masterAm ? trigramDiceSimilarity(getTrigrams(appAm), getTrigrams(masterAm)) : 0;
  const tgSimEn   = appEn && masterEn ? trigramDiceSimilarity(getTrigrams(appEn), getTrigrams(masterEn)) : 0;
  const bestTgSim = Math.max(tgSimAm, tgSimEn);

  const translitSimAm2Am = appTranslit && masterTranslit ? levenshteinSimilarity(appTranslit, masterTranslit) : 0;
  const translitSimAm2En = appTranslit && masterEn       ? levenshteinSimilarity(appTranslit, masterEn)       : 0;
  const translitSimEn2Am = appEn && masterTranslit       ? levenshteinSimilarity(appEn, masterTranslit)       : 0;
  const bestTranslitSim  = Math.max(translitSimAm2Am, translitSimAm2En, translitSimEn2Am);

  const tgTranslitAm2En  = appTranslit && masterEn       ? trigramDiceSimilarity(getTrigrams(appTranslit), getTrigrams(masterEn))       : 0;
  const tgTranslitEn2Am  = appEn && masterTranslit       ? trigramDiceSimilarity(getTrigrams(appEn), getTrigrams(masterTranslit))       : 0;
  const tgTranslitAm2Am  = appTranslit && masterTranslit ? trigramDiceSimilarity(getTrigrams(appTranslit), getTrigrams(masterTranslit)) : 0;
  const bestTgTranslitSim = Math.max(tgTranslitAm2En, tgTranslitEn2Am, tgTranslitAm2Am);

  // Rule 1: Exact match
  if (bestStrSim === 100) {
    ruleFlags.push('Exact match (+)');
    return { finalScore: 100, ruleFlags };
  }

  // Rule 2: Token-reordered exact match
  if (bestTokenSim === 100) {
    ruleFlags.push('Tokens reordered (+)');
    return { finalScore: 98, ruleFlags };
  }

  // Rule 3: Base blended score
  let finalScore = Math.max(
    bestTgSim * 0.90,
    bestTokenSim > bestStrSim
      ? (bestTokenSim * 0.70) + (bestStrSim * 0.20)
      : (bestStrSim * 0.55)  + (bestTokenSim * 0.35),
  );

  // Cross-lingual boost
  if (bestTranslitSim > finalScore || bestTgTranslitSim > finalScore) {
    const translitBlendedScore = Math.max(bestTgTranslitSim * 0.90, bestTranslitSim * 0.85);
    finalScore = Math.max(finalScore, translitBlendedScore);
    if (translitBlendedScore >= 80 && ruleFlags.length === 0) {
      ruleFlags.push('Cross-lingual translation match');
    }
  }

  if (bestTgSim >= 85 && bestTokenSim < 100) {
    ruleFlags.push(`Trigram overlap (${bestTgSim.toFixed(0)}%)`);
    finalScore = Math.max(finalScore, bestTgSim);
  }

  // Rule 4: Subset match
  if (bestSubsetSim === 100 && bestTokenSim < 100) {
    ruleFlags.push('Subset match (+)');
    finalScore = Math.max(finalScore, 85);
  }

  // Rule 5: Acronym match
  const checkAcronym = (shortStr: string, longStr: string): boolean => {
    if (!shortStr || !longStr || shortStr.length < 2 || shortStr.length > 5) return false;
    const tokens = longStr.split(' ').filter(Boolean);
    if (tokens.length >= 2 && tokens.length === shortStr.length) {
      return tokens.map(t => t[0]).join('') === shortStr;
    }
    return false;
  };

  const isAmharicAcronym = checkAcronym(appAm, masterAm) || checkAcronym(masterAm, appAm);
  const isEnglishAcronym = checkAcronym(appEn, masterEn) || checkAcronym(masterEn, appEn);

  if (isAmharicAcronym || isEnglishAcronym) {
    finalScore = Math.max(finalScore, 95);
    ruleFlags.push('Acronym match (+)');
  }

  // Rule 5: Length mismatch penalty
  const mTokens = masterAm.split(' ').length;
  const aTokens = appAm.split(' ').length;
  if (Math.abs(mTokens - aTokens) > 2) {
    finalScore *= 0.8;
    ruleFlags.push('Length mismatch (-20%)');
  }

  // Rule 6: Branch / affiliate detection
  const branchIndicatorsEn = ['branch', 'local', 'parish'];
  const branchIndicatorsAm = ['ቅርንጫፍ', 'አጥቢያ', 'ወረዳ', 'ቀበሌ', 'ክፍለ ከተማ'];

  const mRawStr = (master.church_name || '').toLowerCase();
  const aRawStr = (app.church_name || '').toLowerCase();

  if (finalScore > 70) {
    const mHasBranch = branchIndicatorsEn.some(w => mRawStr.includes(w)) || branchIndicatorsAm.some(w => mRawStr.includes(w));
    const aHasBranch = branchIndicatorsEn.some(w => aRawStr.includes(w)) || branchIndicatorsAm.some(w => aRawStr.includes(w));

    if (mHasBranch !== aHasBranch) {
      ruleFlags.push('Branch / Parent relationship (Affiliate)');
      finalScore *= 0.90;
    } else if (mHasBranch && aHasBranch) {
      ruleFlags.push('Different branches');
      finalScore *= 0.75;
    }
  }

  // Rule 8: Category / type cross-match penalty
  const mType = master.type || master.type || '';
  const aType = app.type || app.type || '';
  if (mType && aType) {
    const mTypeStr = mType.toLowerCase();
    const aTypeStr = aType.toLowerCase();
    const mIsChurch   = mTypeStr.includes('church')   || mTypeStr.includes('ቤ/ክ');
    const mIsMinistry = mTypeStr.includes('ministry') || mTypeStr.includes('ሚኒስትሪ') || mTypeStr.includes('አገልግሎት');
    const aIsChurch   = aTypeStr.includes('church')   || aTypeStr.includes('ቤ/ክ');
    const aIsMinistry = aTypeStr.includes('ministry') || aTypeStr.includes('ሚኒስትሪ') || aTypeStr.includes('አገልግሎት');

    if ((mIsChurch && aIsMinistry) || (mIsMinistry && aIsChurch)) {
      finalScore *= 0.70;
      ruleFlags.push('Type mismatch (-30%)');
    }
  }

  return { finalScore, ruleFlags };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const isBatch = Array.isArray(body.names);

    const applicants: Array<{ name: string; nameEn?: string; category: string }> = isBatch
      ? body.names
      : [{ name: body.name, nameEn: body.nameEn, category: body.category }];

    for (const app of applicants) {
      if (!app.name || typeof app.name !== 'string') {
        return NextResponse.json({ error: 'Each entry requires a "name" string' }, { status: 400, headers: corsHeaders });
      }
      if (!app.category || !['church', 'ministry'].includes(app.category)) {
        return NextResponse.json(
          { error: 'Each entry requires a valid "category": "church" or "ministry"' },
          { status: 400, headers: corsHeaders },
        );
      }
    }

    // ── Fetch ALL master records (paginated, mirrors fetchMasterRecords in portal) ─
    const supabase = getServiceSupabase();
    let allData: any[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, church_name, certificate_no, type')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
      if (data && data.length > 0) {
        allData = allData.concat(data);
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    if (!allData || allData.length === 0) {
      const emptyResult = applicants.map(app => ({
        query: { name: app.name, nameEn: app.nameEn ?? '', category: app.category },
        exactMatchFound: false,
        matchType: 'Unique',
        similarity: 0,
        candidates: [],
      }));
      return NextResponse.json(
        { success: true, results: isBatch ? emptyResult : emptyResult[0] },
        { headers: corsHeaders },
      );
    }

    // ── Pre-normalise ALL master records ──────────────────────────────────────
    const mNorm: NormalizedRecord[] = allData.map((m) => {
      const raw = m.church_name ?? '';
      const normalizedAm = normalizeAmharic(raw);
      const hasLatin = /[a-zA-Z]/.test(raw);
      const normalizedEn = hasLatin ? normalizeEnglish(raw) : '';

      return {
        id: m.id,
        church_name: raw,
        certificate_no: m.certificate_no ?? '',
        type: m.type ?? '',
        normalizedAm,
        normalizedEn,
      };
    });

    // ── Process each applicant ─────────────────────────────────────────────────
    const processApplicant = (app: { name: string; nameEn?: string; category: string }) => {
      const aNormAm = normalizeAmharic(app.name);
      const hasLatinQuery = app.nameEn ? true : /[a-zA-Z]/.test(app.name);
      const aNormEn = hasLatinQuery ? normalizeEnglish(app.nameEn || app.name) : '';

      const aNorm: NormalizedApplicant = {
        church_name: app.name,
        normalizedAm: aNormAm,
        normalizedEn: aNormEn,
        type: app.category,
      };

      // ── Score ALL records ─────────────────────────────────────────────────────
      const candidateScores = mNorm.map(master => {
        const { finalScore, ruleFlags } = calculateScore(master, aNorm);
        return { score: finalScore, candidate: master, ruleFlags };
      });

      candidateScores.sort((a, b) => b.score - a.score);

      const bestScore = candidateScores[0]?.score ?? 0;

      const closeMatches = candidateScores.slice(0, 5).map(c => ({
        name: c.candidate.church_name,
        normalizedAm: c.candidate.normalizedAm,
        registrationId: c.candidate.certificate_no || 'N/A',
        type: c.candidate.type || '',
        score: parseFloat(c.score.toFixed(1)),
        status: c.score >= 90 ? 'High Similarity' : c.score >= 75 ? 'Moderate Similarity' : 'Low Similarity',
        ruleFlags: c.ruleFlags,
      }));

      let matchType: 'Likely Duplicate' | 'Needs Manual Review' | 'Unique' = 'Unique';
      if (bestScore >= 90) matchType = 'Likely Duplicate';
      else if (bestScore >= 75) matchType = 'Needs Manual Review';

      const candidates = closeMatches.filter(c => c.score > 60);

      return {
        query: {
          name: app.name,
          nameEn: app.nameEn ?? '',
          category: app.category,
        },
        exactMatchFound: bestScore >= 90,
        matchType,
        similarity: parseFloat(bestScore.toFixed(1)),
        candidates,
      };
    };

    const results = applicants.map(processApplicant);

    return NextResponse.json(
      { success: true, results: isBatch ? results : results[0] },
      { headers: corsHeaders },
    );

  } catch (error: any) {
    console.error('Check API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
