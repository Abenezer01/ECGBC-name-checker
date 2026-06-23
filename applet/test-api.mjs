// Verify API matches internal portal results — node applet/test-api.mjs
const BASE = 'http://localhost:3001';

async function check(name, nameEn = '', category = 'church') {
  const res = await fetch(`${BASE}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, nameEn: nameEn || undefined, category }),
  });
  const data = await res.json();
  const r = data.results;
  console.log(`\n── "${name}" ──`);
  console.log(`   matchType:  ${r.matchType}`);
  console.log(`   similarity: ${r.similarity}%`);
  if (!r.candidates?.length) {
    console.log('   candidates: (none above 60%)');
  } else {
    r.candidates.forEach(c =>
      console.log(`   ${String(c.score).padStart(5)}%  ${c.name}  [${c.ruleFlags?.join(', ')}]`)
    );
  }
}

console.log('=== API verification ===');
// Portal shows: ኢነር ታበርናክል ቸርች 78.9%
await check('ኢነር ታበርናክ');
await check('ኢነር ታበርናክ', 'Inner Tabernacle');

// Exact match
await check('መሰረተ ክርስቶስ');

// Acronym
await check('MKC');

// Subset match
await check('ቃለ ህይወት');
