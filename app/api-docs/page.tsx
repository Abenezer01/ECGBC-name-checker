'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/components';
import { Play, ChevronDown, ChevronRight, Info } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionBadge({ method }: { method: 'POST' | 'GET' }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${method === 'POST' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: number }) {
  const ok = status >= 200 && status < 300;
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {status} {ok ? 'OK' : 'Error'}
    </span>
  );
}

function CodeBlock({ code, lang = 'json' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-slate-900 rounded-lg p-4 text-[11px] text-green-400 overflow-x-auto whitespace-pre">
      {code}
    </pre>
  );
}

function Field({
  name, type, required, description,
}: { name: string; type: string; required?: boolean; description: string }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 pr-3 font-mono text-xs text-blue-700 whitespace-nowrap">{name}</td>
      <td className="py-2 pr-3 text-xs text-slate-500 whitespace-nowrap">{type}</td>
      <td className="py-2 pr-3">
        {required
          ? <span className="text-xs font-medium text-red-600">required</span>
          : <span className="text-xs text-slate-400">optional</span>}
      </td>
      <td className="py-2 text-xs text-slate-600">{description}</td>
    </tr>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors"
      >
        {title}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApiDocs() {
  const host = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  // Check form state
  const [checkForm, setCheckForm] = useState({
    name: '', nameEn: '', category: 'church', batchMode: false,
  });
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // Book form state
  const [bookForm, setBookForm] = useState({
    nameAm: '', nameEn: '', applicantName: '', phoneNumber: '', category: 'church',
  });
  const [bookLoading, setBookLoading] = useState(false);
  const [bookResult, setBookResult] = useState<any>(null);

  const handleTestCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckLoading(true);
    setCheckResult(null);
    try {
      const start = Date.now();
      const body = checkForm.batchMode
        ? { names: [{ name: checkForm.name, nameEn: checkForm.nameEn || undefined, category: checkForm.category }] }
        : { name: checkForm.name, nameEn: checkForm.nameEn || undefined, category: checkForm.category };
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setCheckResult({ status: res.status, time: Date.now() - start, data });
    } catch (err: any) {
      setCheckResult({ status: 500, time: 0, data: { error: err.message } });
    } finally {
      setCheckLoading(false);
    }
  };

  const handleTestBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookLoading(true);
    setBookResult(null);
    try {
      const start = Date.now();
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookForm),
      });
      const data = await res.json();
      setBookResult({ status: res.status, time: Date.now() - start, data });
    } catch (err: any) {
      setBookResult({ status: 500, time: 0, data: { error: err.message } });
    } finally {
      setBookLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">API Documentation & Playground</h1>
        <p className="text-slate-500 text-sm">
          Integrate the ECGBC Name Checker and Name Booking system into your external platform.
          All endpoints accept JSON and respond with JSON. CORS is open (<code className="bg-slate-100 px-1 rounded">*</code>).
        </p>
      </div>

      {/* ── 1. Name Check API ─────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 border-b pb-3">
          <SectionBadge method="POST" />
          <h2 className="text-xl font-bold text-slate-900">Name Checker</h2>
          <code className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded font-mono">/api/check</code>
        </div>

        <p className="text-sm text-slate-600">
          Checks whether a church or ministry name conflicts with existing registered names.
          Uses a TF-IDF trigram index + multi-signal scoring (Levenshtein, token Jaccard, trigram Dice,
          cross-lingual transliteration) plus a rule engine for acronyms, branch detection,
          and category mismatches.
        </p>

        {/* Request schema */}
        <Collapsible title="Request Body — Single Mode">
          <div className="mb-3 text-xs text-slate-500 flex items-start gap-1.5">
            <Info size={13} className="mt-0.5 shrink-0" />
            Send a single object to check one name at a time.
          </div>
          <table className="w-full">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="pb-1 pr-3">Field</th><th className="pb-1 pr-3">Type</th>
              <th className="pb-1 pr-3">Required</th><th className="pb-1">Description</th>
            </tr></thead>
            <tbody>
              <Field name="name"     type="string"  required description="Primary name to check (Amharic or English)." />
              <Field name="nameEn"   type="string"           description="English version of the name. Enables cross-lingual matching when provided alongside an Amharic name." />
              <Field name="category" type="string"  required description='"church" or "ministry". Used for type cross-match penalty.' />
            </tbody>
          </table>
          <div className="mt-4">
            <CodeBlock code={`POST /api/check\n\n{\n  "name": "ኢነር ታበርናክ",\n  "nameEn": "Inner Tabernacle",\n  "category": "church"\n}`} />
          </div>
        </Collapsible>

        <Collapsible title="Request Body — Batch Mode">
          <div className="mb-3 text-xs text-slate-500 flex items-start gap-1.5">
            <Info size={13} className="mt-0.5 shrink-0" />
            Send an array under <code>names</code> to check multiple names in one request.
            The trigram index is built once and reused for every entry — much more efficient than repeated single calls.
          </div>
          <table className="w-full">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="pb-1 pr-3">Field</th><th className="pb-1 pr-3">Type</th>
              <th className="pb-1 pr-3">Required</th><th className="pb-1">Description</th>
            </tr></thead>
            <tbody>
              <Field name="names" type="array" required description="Array of name objects. Each follows the same schema as single mode (name, nameEn?, category)." />
            </tbody>
          </table>
          <div className="mt-4">
            <CodeBlock code={`POST /api/check\n\n{\n  "names": [\n    { "name": "ኢነር ታበርናክ", "category": "church" },\n    { "name": "MKC", "nameEn": "Meserete Kristos Church", "category": "church" }\n  ]\n}`} />
          </div>
        </Collapsible>

        {/* Response schema */}
        <Collapsible title="Response Schema">
          <p className="text-xs text-slate-500 mb-3">
            Single mode returns a <code>results</code> object directly. Batch mode returns <code>results</code> as an array, one entry per input.
          </p>
          <table className="w-full mb-4">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="pb-1 pr-3">Field</th><th className="pb-1 pr-3">Type</th><th className="pb-1">Description</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">success</td><td className="py-2 pr-3 text-xs text-slate-500">boolean</td><td className="py-2 text-xs text-slate-600">Always <code>true</code> on 200 responses.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">results.query</td><td className="py-2 pr-3 text-xs text-slate-500">object</td><td className="py-2 text-xs text-slate-600">Echo of the input fields.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">results.exactMatchFound</td><td className="py-2 pr-3 text-xs text-slate-500">boolean</td><td className="py-2 text-xs text-slate-600"><code>true</code> when the top match scores ≥ 90.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">results.matchType</td><td className="py-2 pr-3 text-xs text-slate-500">string</td><td className="py-2 text-xs text-slate-600"><code>"Likely Duplicate"</code> (≥90) · <code>"Needs Manual Review"</code> (75–89) · <code>"Unique"</code> (&lt;75).</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">results.similarity</td><td className="py-2 pr-3 text-xs text-slate-500">number</td><td className="py-2 text-xs text-slate-600">Score of the top candidate, 0–100.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">results.candidates</td><td className="py-2 pr-3 text-xs text-slate-500">array</td><td className="py-2 text-xs text-slate-600">Up to 5 closest matches (score &gt; 60), ordered by score descending.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">candidates[].name</td><td className="py-2 pr-3 text-xs text-slate-500">string</td><td className="py-2 text-xs text-slate-600">Registered name of the conflicting record.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">candidates[].registrationId</td><td className="py-2 pr-3 text-xs text-slate-500">string</td><td className="py-2 text-xs text-slate-600">Certificate / registration number.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">candidates[].score</td><td className="py-2 pr-3 text-xs text-slate-500">number</td><td className="py-2 text-xs text-slate-600">Similarity score for this candidate, 0–100.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">candidates[].status</td><td className="py-2 pr-3 text-xs text-slate-500">string</td><td className="py-2 text-xs text-slate-600"><code>"High Similarity"</code> · <code>"Moderate Similarity"</code> · <code>"Low Similarity"</code>.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-xs text-blue-700">candidates[].ruleFlags</td><td className="py-2 pr-3 text-xs text-slate-500">string[]</td><td className="py-2 text-xs text-slate-600">Reasons behind the score, e.g. <code>["Cross-lingual transliteration match", "Same city (+15%)"]</code>.</td></tr>
            </tbody>
          </table>
          <CodeBlock code={`{\n  "success": true,\n  "results": {\n    "query": { "name": "ኢነር ታበርናክ", "nameEn": "Inner Tabernacle", "category": "church" },\n    "exactMatchFound": true,\n    "matchType": "Likely Duplicate",\n    "similarity": 97.5,\n    "candidates": [\n      {\n        "id": "uuid-...",\n        "name": "ኢነር ታበርናክ ቤተ ክርስቲያን",\n        "registrationId": "ECG-2021-004",\n        "type": "church",\n        "score": 97.5,\n        "status": "High Similarity",\n        "ruleFlags": ["Subset match (+)"]\n      }\n    ]\n  }\n}`} />
        </Collapsible>

        {/* Rule Flags reference */}
        <Collapsible title="Rule Flags Reference">
          <p className="text-xs text-slate-500 mb-3">
            Each candidate includes <code>ruleFlags</code> explaining which scoring rules fired.
            Use these to display meaningful explanations to applicants.
          </p>
          <table className="w-full">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="pb-1 pr-4">Flag</th><th className="pb-1">Meaning</th>
            </tr></thead>
            <tbody className="text-xs">
              {[
                ['Exact match (+)', 'Raw or normalized strings are identical. Score forced to 100.'],
                ['Tokens reordered (+)', 'Same words, different order (e.g. "Kale Heywet Addis" vs "Addis Kale Heywet"). Score → 98.'],
                ['Cross-lingual transliteration match', 'Amharic text transliterated to Latin matched the English name (or vice versa).'],
                ['Trigram overlap (N%)', 'High character-trigram overlap detected at N%.'],
                ['Subset match (+)', 'All tokens of the shorter name are contained within the longer name. Baseline raised to 85.'],
                ['Acronym match (+)', 'One name is an acronym of the other (e.g. "MKC" → "Meserete Kristos Church"). Score raised to 95.'],
                ['Length mismatch (−20%)', 'Token count differs by more than 2 — likely different organizations with partially similar names.'],
                ['Branch / Parent relationship (Affiliate)', 'One record has a branch indicator ("branch", "ቅርንጫፍ") while the other does not — likely parent vs branch.'],
                ['Different branches', 'Both have branch indicators but are in different cities.'],
                ['Type mismatch (−30%)', 'One is a church, the other a ministry — penalized for category cross-match.'],
              ].map(([flag, desc]) => (
                <tr key={flag} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 font-mono text-blue-700 whitespace-nowrap">{flag}</td>
                  <td className="py-2 text-slate-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Collapsible>

        {/* cURL example */}
        <Collapsible title="cURL Examples">
          <p className="text-xs font-medium text-slate-600 mb-2">Single check</p>
          <CodeBlock code={`curl -X POST ${host}/api/check \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"ኢነር ታበርናክ","nameEn":"Inner Tabernacle","category":"church"}'`} />
          <p className="text-xs font-medium text-slate-600 mt-4 mb-2">Batch check</p>
          <CodeBlock code={`curl -X POST ${host}/api/check \\\n  -H "Content-Type: application/json" \\\n  -d '{"names":[{"name":"MKC","category":"church"},{"name":"ቃለ ህይወት","category":"church"}]}'`} />
        </Collapsible>

        {/* Live tester */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Play size={15} /> Live Tester — Name Checker
          </h3>
          <form onSubmit={handleTestCheck} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name (Amharic / primary)</label>
                <input required type="text" value={checkForm.name}
                  onChange={e => setCheckForm({ ...checkForm, name: e.target.value })}
                  placeholder="e.g. ኢነር ታበርናክ"
                  className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name English (optional)</label>
                <input type="text" value={checkForm.nameEn}
                  onChange={e => setCheckForm({ ...checkForm, nameEn: e.target.value })}
                  placeholder="e.g. Inner Tabernacle"
                  className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select value={checkForm.category} onChange={e => setCheckForm({ ...checkForm, category: e.target.value })}
                className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500">
                <option value="church">Church</option>
                <option value="ministry">Ministry</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={checkForm.batchMode}
                onChange={e => setCheckForm({ ...checkForm, batchMode: e.target.checked })} />
              Send as batch request (<code>names: [...]</code>)
            </label>
            <button type="submit" disabled={checkLoading}
              className="w-full bg-slate-900 text-white font-medium py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors">
              {checkLoading ? 'Sending...' : 'Send Request'}
            </button>
          </form>
          {checkResult && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={checkResult.status} />
                <span className="text-xs text-slate-500">{checkResult.time}ms</span>
              </div>
              <pre className="bg-slate-900 rounded-lg p-4 text-[11px] text-green-400 overflow-x-auto max-h-72 overflow-y-auto">
                {JSON.stringify(checkResult.data, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </section>

      {/* ── 2. Name Booking API ──────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 border-b pb-3">
          <SectionBadge method="POST" />
          <h2 className="text-xl font-bold text-slate-900">Name Booking</h2>
          <code className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded font-mono">/api/book</code>
        </div>

        <p className="text-sm text-slate-600">
          Submits a name registration request. The booking is stored as <code>pending</code> and
          will appear in the admin dashboard for review. Admins can approve or reject it from there.
        </p>

        <Collapsible title="Request Body">
          <table className="w-full">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="pb-1 pr-3">Field</th><th className="pb-1 pr-3">Type</th>
              <th className="pb-1 pr-3">Required</th><th className="pb-1">Description</th>
            </tr></thead>
            <tbody>
              <Field name="nameAm"        type="string" description="Amharic name. Required if nameEn is absent." />
              <Field name="nameEn"        type="string" description="English name. Required if nameAm is absent." />
              <Field name="applicantName" type="string" required description="Full name of the person submitting the request." />
              <Field name="phoneNumber"   type="string" required description="Contact phone number of the applicant." />
              <Field name="category"      type="string" required description='"church" or "ministry".' />
            </tbody>
          </table>
          <div className="mt-4">
            <CodeBlock code={`POST /api/book\n\n{\n  "nameAm": "እየሱስ ያድናል",\n  "nameEn": "Jesus Saves",\n  "applicantName": "Abebe Kebede",\n  "phoneNumber": "0911000000",\n  "category": "church"\n}`} />
          </div>
        </Collapsible>

        <Collapsible title="Response Schema">
          <table className="w-full mb-4">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="pb-1 pr-3">Field</th><th className="pb-1 pr-3">Type</th><th className="pb-1">Description</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">success</td><td className="py-2 pr-3 text-xs text-slate-500">boolean</td><td className="py-2 text-xs text-slate-600"><code>true</code> on success.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">message</td><td className="py-2 pr-3 text-xs text-slate-500">string</td><td className="py-2 text-xs text-slate-600">Human-readable confirmation.</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3 font-mono text-xs text-blue-700">bookingId</td><td className="py-2 pr-3 text-xs text-slate-500">string (uuid)</td><td className="py-2 text-xs text-slate-600">ID of the created booking. Store this to track status.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-xs text-blue-700">data</td><td className="py-2 pr-3 text-xs text-slate-500">object</td><td className="py-2 text-xs text-slate-600">Full inserted row from the database.</td></tr>
            </tbody>
          </table>
          <CodeBlock code={`{\n  "success": true,\n  "message": "Name booking submitted successfully",\n  "bookingId": "b3f2a1...",\n  "data": {\n    "id": "b3f2a1...",\n    "church_name_am": "እየሱስ ያድናል",\n    "church_name_en": "Jesus Saves",\n    "applicant_name": "Abebe Kebede",\n    "phone_number": "0911000000",\n    "category": "church",\n    "status": "pending",\n    "created_at": "2026-06-21T08:00:00Z"\n  }\n}`} />
        </Collapsible>

        <Collapsible title="cURL Example">
          <CodeBlock code={`curl -X POST ${host}/api/book \\\n  -H "Content-Type: application/json" \\\n  -d '{"nameAm":"እየሱስ ያድናል","nameEn":"Jesus Saves","applicantName":"Abebe Kebede","phoneNumber":"0911000000","category":"church"}'`} />
        </Collapsible>

        {/* Live tester */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Play size={15} /> Live Tester — Name Booking
          </h3>
          <form onSubmit={handleTestBook} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name (Amharic)</label>
                <input type="text" value={bookForm.nameAm}
                  onChange={e => setBookForm({ ...bookForm, nameAm: e.target.value })}
                  placeholder="e.g. እየሱስ ያድናል"
                  className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name (English)</label>
                <input type="text" value={bookForm.nameEn}
                  onChange={e => setBookForm({ ...bookForm, nameEn: e.target.value })}
                  placeholder="e.g. Jesus Saves"
                  className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Applicant Name</label>
                <input required type="text" value={bookForm.applicantName}
                  onChange={e => setBookForm({ ...bookForm, applicantName: e.target.value })}
                  placeholder="Abebe Kebede"
                  className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                <input required type="text" value={bookForm.phoneNumber}
                  onChange={e => setBookForm({ ...bookForm, phoneNumber: e.target.value })}
                  placeholder="0911000000"
                  className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select value={bookForm.category} onChange={e => setBookForm({ ...bookForm, category: e.target.value })}
                className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500">
                <option value="church">Church</option>
                <option value="ministry">Ministry</option>
              </select>
            </div>
            <button type="submit" disabled={bookLoading}
              className="w-full bg-slate-900 text-white font-medium py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors">
              {bookLoading ? 'Sending...' : 'Send Request'}
            </button>
          </form>
          {bookResult && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={bookResult.status} />
                <span className="text-xs text-slate-500">{bookResult.time}ms</span>
              </div>
              <pre className="bg-slate-900 rounded-lg p-4 text-[11px] text-green-400 overflow-x-auto max-h-64 overflow-y-auto">
                {JSON.stringify(bookResult.data, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </section>

      {/* ── Error responses ──────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 border-b pb-3">
          <h2 className="text-xl font-bold text-slate-900">Error Responses</h2>
        </div>
        <p className="text-sm text-slate-600">
          All errors return a JSON object with an <code>error</code> string and an appropriate HTTP status code.
        </p>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
            <th className="pb-1 pr-4">Status</th><th className="pb-1 pr-4">Condition</th><th className="pb-1">Example body</th>
          </tr></thead>
          <tbody className="text-xs">
            {[
              ['400', 'Missing or invalid field', '{"error":"Each entry requires a valid \\"category\\": \\"church\\" or \\"ministry\\""}'],
              ['500', 'Database or server error', '{"error":"relation \\"organizations\\" does not exist"}'],
            ].map(([code, cond, body]) => (
              <tr key={code} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-4 font-mono font-bold text-red-600">{code}</td>
                <td className="py-2 pr-4 text-slate-600">{cond}</td>
                <td className="py-2 font-mono text-slate-500 break-all">{body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="text-center text-slate-400 pt-4 pb-12 text-xs space-y-1">
        <p>All endpoints use <code className="bg-slate-100 text-slate-600 px-1 rounded">Access-Control-Allow-Origin: *</code> — no auth required for public access.</p>
        <p>Ensure the Supabase schema (<code className="bg-slate-100 text-slate-600 px-1 rounded">supabase_schema.sql</code>) is applied before calling the booking endpoint.</p>
      </div>

    </div>
  );
}
