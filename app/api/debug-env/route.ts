import { NextResponse, NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { normalizeAmharic } from '@/lib/amharic';
import { levenshteinSimilarity, tokenJaccardSimilarity, getTrigrams, trigramDiceSimilarity, tokenSubsetSimilarity } from '@/lib/similarity';
import { transliterateAmharic } from '@/lib/amharic';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();

    const { data: target } = await supabase
      .from('organizations')
      .select('id, church_name, certificate_no, type')
      .eq('certificate_no', '03288')
      .single();

    if (!target) return NextResponse.json({ error: 'record 03288 not found' });

    const raw = target.church_name;
    const query = 'ኢነር ታበርናክ';

    const mNormAm = normalizeAmharic(raw);
    const qNormAm = normalizeAmharic(query);

    // Exact scoring
    const levSim = levenshteinSimilarity(qNormAm, mNormAm);
    const tokSim = tokenJaccardSimilarity(qNormAm, mNormAm);
    const subSim = tokenSubsetSimilarity(qNormAm, mNormAm);
    const tgSim  = trigramDiceSimilarity(getTrigrams(qNormAm), getTrigrams(mNormAm));

    let finalScore = Math.max(
      tgSim * 0.90,
      tokSim > levSim
        ? tokSim * 0.70 + levSim * 0.20
        : levSim * 0.55 + tokSim * 0.35
    );
    if (subSim === 100 && tokSim < 100) finalScore = Math.max(finalScore, 85);
    if (tgSim >= 85 && tokSim < 100) finalScore = Math.max(finalScore, tgSim);

    // Show raw bytes from Supabase
    const rawHex = Buffer.from(raw, 'utf8').toString('hex');
    const queryHex = Buffer.from(query, 'utf8').toString('hex');

    return NextResponse.json({
      db_raw: raw,
      db_raw_hex: rawHex,
      query,
      query_hex: queryHex,
      mNormAm,
      qNormAm,
      mNormAm_hex: Buffer.from(mNormAm, 'utf8').toString('hex'),
      qNormAm_hex: Buffer.from(qNormAm, 'utf8').toString('hex'),
      scores: { levSim, tokSim, subSim, tgSim, finalScore },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
