// Verify the fix: node applet/trace-score.mjs
const amharicStopwords = new Set([
  'ቤተክርስቲያን','ቤተ','ክርስቲያን','ወንጌላዊት','አጥቢያ','ሚኒስትሪ','ሚኒስትሪስ','ሚንስትሪ',
  'ማህበር','አገልግሎት','ዓለም','አለም','አቀፍ','ኢንተርናሽናል','ሙሉ','ወንጌል','አማኞች',
  'እምነት','ቤ/ክ','ቤ/ክርስቲያን','የ','እና','በ','ከ','ት/ቤት','ማዕከል','ማእከል',
  'መካነ','ኢየሱስ','እየሱስ','ፕሮቴስታንት','ካቶሊክ','ኦርቶዶክስ','ቸርች','ችርች',
  'ወረዳ','ክፍለ','ከተማ','ቀበሌ','ዘ','ኦፍ'
]);
function normalizeAmharic(text) {
  if (!text) return '';
  let n = text.replace(/[\s_]+/g, ' ').trim();
  const map = {'ሐ':'ሀ','ሑ':'ሁ','ሒ':'ሂ','ሓ':'ሃ','ሔ':'ሄ','ሕ':'ህ','ሖ':'ሆ','ኀ':'ሀ','ኁ':'ሁ','ኂ':'ሂ','ኃ':'ሃ','ኄ':'ሄ','ኅ':'ህ','ኆ':'ሆ','ሠ':'ሰ','ሡ':'ሱ','ሢ':'ሲ','ሣ':'ሳ','ሤ':'ሴ','ሥ':'ስ','ሦ':'ሶ','ፀ':'ጸ','ፁ':'ጹ','ፂ':'ጺ','ፃ':'ጻ','ፄ':'ጼ','ፅ':'ጽ','ፆ':'ጾ','ዐ':'አ','ዑ':'ኡ','ዒ':'ኢ','ዓ':'ኣ','ዔ':'ኤ','ዕ':'እ','ዖ':'ኦ','ዉ':'ው','ዪ':'ይ'};
  n = n.replace(/[፡፤፥-፧፨\.,!\?\/\\()\[\]"'`]/g, ' ');
  n = n.split('').map(c => map[c] || c).join('');
  n = n.split(/\s+/).filter(w => !amharicStopwords.has(w)).join(' ');
  return n.replace(/\s+/g, ' ').trim();
}
const stopwords = new Set(['church','ministry','fellowship','evangelical','international','center','ministries','gospel','the','of','and','in','at','assembly','assemblies','congregation','parish','a','an','inc','ltd','global','mission','north','south','east','west']);
function normalizeEnglish(text) {
  if (!text) return '';
  let n = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,' ').replace(/\s+/g,' ').trim();
  return n.split(' ').filter(w => !stopwords.has(w)).join(' ');
}
function levSim(a, b) {
  if (!a && !b) return 100; if (!a || !b) return 0;
  const m = Array.from({length:a.length+1},(_,i)=>[i]);
  for (let j=0;j<=b.length;j++) m[0][j]=j;
  for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++) {
    const c=a[i-1]===b[j-1]?0:1;
    m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+c);
  }
  return Math.max(0,(1-m[a.length][b.length]/Math.max(a.length,b.length))*100);
}
function jaccard(s1,s2) {
  const t1=new Set(s1.split(' ').filter(Boolean)),t2=new Set(s2.split(' ').filter(Boolean));
  if(!t1.size&&!t2.size) return 100; if(!t1.size||!t2.size) return 0;
  let i=0; for(const t of t1) if(t2.has(t)) i++;
  return (i/(t1.size+t2.size-i))*100;
}
function subset(s1,s2) {
  const t1=new Set(s1.split(' ').filter(Boolean)),t2=new Set(s2.split(' ').filter(Boolean));
  if(!t1.size&&!t2.size) return 100; if(!t1.size||!t2.size) return 0;
  let i=0; for(const t of t1) if(t2.has(t)) i++;
  return (i/Math.min(t1.size,t2.size))*100;
}
function getTg(s) {
  if(!s) return []; const r=[];
  const str='__'+s.replace(/\s+/g,'_')+'__';
  for(let i=0;i<str.length-2;i++) r.push(str.slice(i,i+3));
  return r;
}
function dice(t1,t2) {
  if(!t1.length||!t2.length) return 0;
  let i=0,t2c=[...t2];
  for(const t of t1){const x=t2c.indexOf(t);if(x!==-1){i++;t2c.splice(x,1);}}
  return (2*i/(t1.length+t2.length))*100;
}

function score(qName, qNameEn, masterName) {
  const qAm = normalizeAmharic(qName);
  const hasLatin = qNameEn ? true : /[a-zA-Z]/.test(qName);
  const qEn = hasLatin ? normalizeEnglish(qNameEn || qName) : '';

  const mRaw = masterName;
  const mAm = normalizeAmharic(mRaw);
  const mHasLatin = /[a-zA-Z]/.test(mRaw);
  const mEn = mHasLatin ? normalizeEnglish(mRaw) : '';

  const bestStr = Math.max(qAm&&mAm?levSim(qAm,mAm):0, qEn&&mEn?levSim(qEn,mEn):0);
  const bestTok = Math.max(qAm&&mAm?jaccard(qAm,mAm):0, qEn&&mEn?jaccard(qEn,mEn):0);
  const bestSub = Math.max(qAm&&mAm?subset(qAm,mAm):0, qEn&&mEn?subset(qEn,mEn):0);
  const bestTg  = Math.max(qAm&&mAm?dice(getTg(qAm),getTg(mAm)):0, qEn&&mEn?dice(getTg(qEn),getTg(mEn)):0);

  if (bestStr===100) return 100;
  if (bestTok===100) return 98;

  let s = Math.max(bestTg*0.9, bestTok>bestStr ? bestTok*0.7+bestStr*0.2 : bestStr*0.55+bestTok*0.35);
  if (bestSub===100 && bestTok<100) s = Math.max(s, 85);
  if (bestTg>=85 && bestTok<100) s = Math.max(s, bestTg);

  return s;
}

// Test cases — portal expected results in comments
const cases = [
  ['ኢነር ታበርናክ', '', 'ኢነር ታበርናክል ቸርች'],       // portal: 78.9%
  ['ኢነር ታበርናክ', '', 'ኢነር የወንጌል አገልግሎት'],       // portal: 39.2%
  ['MKC', '', 'መሰረተ ክርስቶስ ቤተ ክርስቲያን'],           // portal: acronym ~95%
  ['ቃለ ህይወት', '', 'ኢትዮጵያ ቃለ ሕይወት ቤተ ክርስቲያን'],   // portal: subset 85%
];

for (const [q, qEn, m] of cases) {
  const s = score(q, qEn, m).toFixed(1);
  console.log(`"${q}" vs "${m}" → ${s}%`);
}
