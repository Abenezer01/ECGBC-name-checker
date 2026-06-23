// node applet/test-api.mjs
const BASE = 'http://localhost:3001';

async function check(name, category = 'church') {
  const res = await fetch(`${BASE}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category }),
  });
  const data = await res.json();
  const r = data.results;
  console.log(`\n── "${name}" ──`);
  console.log(`   ${r.matchType} | ${r.similarity}%`);
  r.candidates?.forEach(c => console.log(`   ${c.score}%  ${c.name}  [${c.ruleFlags?.join(', ')}]`));
  if (!r.candidates?.length) console.log('   (no candidates above 60%)');
}

await check('ኢነር ታበርናክ');          // expect ~78.9%  → ኢነር ታበርናክል ቸርች
await check('ሙሉ ወንጌል');             // expect match  → የኢትዮጵያ ሙሉ ወንጌል አማኞች ቤተ ክርስቲያን
await check('መሰረተ ክርስቶስ');          // expect 100%
await check('MKC');                  // expect acronym ~95%
await check('ቃለ ህይወት');             // expect subset 85%
