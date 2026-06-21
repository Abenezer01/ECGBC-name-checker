'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/components';
import { Play, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ApiDocs() {
  const host = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  const [checkForm, setCheckForm] = useState({ name: '', category: 'church' });
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  const [bookForm, setBookForm] = useState({ nameAm: '', nameEn: '', applicantName: '', phoneNumber: '', category: 'church' });
  const [bookLoading, setBookLoading] = useState(false);
  const [bookResult, setBookResult] = useState<any>(null);

  const handleTestCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckLoading(true);
    setCheckResult(null);
    try {
      const start = Date.now();
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkForm)
      });
      const data = await res.json();
      const time = Date.now() - start;
      setCheckResult({ status: res.status, time, data });
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
        body: JSON.stringify(bookForm)
      });
      const data = await res.json();
      const time = Date.now() - start;
      setBookResult({ status: res.status, time, data });
    } catch (err: any) {
      setBookResult({ status: 500, time: 0, data: { error: err.message } });
    } finally {
      setBookLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">API Documentation & Playground</h1>
        <p className="text-slate-600">Integrate the Name Checker and Name Booker into your external website and test live requests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
        {/* Name Checker Section */}
        <div className="space-y-6">
          <Card className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b pb-2">1. Name Checker API</h2>
            <p className="text-slate-600 mb-4 text-sm">
              Check if a church or ministry name already exists or is highly similar to registered names (Fuzzy Match & Cross-Lingual).
            </p>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs overflow-x-auto text-green-400 mb-6">
              <span className="text-blue-400">POST</span> {host}/api/check
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Play size={16} /> Live Tester
              </h3>
              <form onSubmit={handleTestCheck} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input type="text" required value={checkForm.name} onChange={e => setCheckForm({ ...checkForm, name: e.target.value })} placeholder="e.g. ኢነር ታበርናክ" className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select value={checkForm.category} onChange={e => setCheckForm({ ...checkForm, category: e.target.value })} className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    <option value="church">Church</option>
                    <option value="ministry">Ministry</option>
                  </select>
                </div>
                <button type="submit" disabled={checkLoading} className="w-full bg-slate-900 text-white font-medium py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors">
                  {checkLoading ? 'Sending...' : 'Send Request'}
                </button>
              </form>

              {checkResult && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                   <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${checkResult.status === 200 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {checkResult.status} {checkResult.status === 200 ? 'OK' : 'Error'}
                      </span>
                      <span className="text-xs text-slate-500">{checkResult.time}ms</span>
                   </div>
                   <pre className="bg-slate-900 rounded p-4 text-[11px] text-green-400 overflow-x-auto max-h-64 overflow-y-auto">
                     {JSON.stringify(checkResult.data, null, 2)}
                   </pre>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mt-6 mb-2">Example cURL</h3>
              <pre className="bg-slate-900 p-3 rounded-lg text-xs text-slate-300 whitespace-pre-wrap">
{`curl -X POST ${host}/api/check \\
  -H "Content-Type: application/json" \\
  -d '{"name":"ኢነር ታበርናክ","category":"church"}'`}
              </pre>
            </div>
          </Card>
        </div>

        {/* Name Booker Section */}
        <div className="space-y-6">
          <Card className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b pb-2">2. Name Booking API</h2>
            <p className="text-slate-600 mb-4 text-sm">
              Submit a request to book a new church or ministry name directly from your external system.
            </p>
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs overflow-x-auto text-green-400 mb-6">
              <span className="text-blue-400">POST</span> {host}/api/book
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Play size={16} /> Live Tester
              </h3>
              <form onSubmit={handleTestBook} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name (Amharic)</label>
                    <input type="text" value={bookForm.nameAm} onChange={e => setBookForm({ ...bookForm, nameAm: e.target.value })} placeholder="e.g. እየሱስ ያድናል" className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name (English)</label>
                    <input type="text" value={bookForm.nameEn} onChange={e => setBookForm({ ...bookForm, nameEn: e.target.value })} placeholder="e.g. Jesus Saves" className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Applicant Name</label>
                    <input type="text" required value={bookForm.applicantName} onChange={e => setBookForm({ ...bookForm, applicantName: e.target.value })} placeholder="Abebe Kebede" className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                    <input type="text" required value={bookForm.phoneNumber} onChange={e => setBookForm({ ...bookForm, phoneNumber: e.target.value })} placeholder="0911000000" className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select value={bookForm.category} onChange={e => setBookForm({ ...bookForm, category: e.target.value })} className="w-full text-sm border-slate-300 rounded px-3 py-2 border focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    <option value="church">Church</option>
                    <option value="ministry">Ministry</option>
                  </select>
                </div>
                
                <button type="submit" disabled={bookLoading} className="w-full bg-slate-900 text-white font-medium py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors">
                  {bookLoading ? 'Sending...' : 'Send Request'}
                </button>
              </form>

              {bookResult && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                   <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${bookResult.status === 200 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {bookResult.status} {bookResult.status === 200 ? 'OK' : 'Error'}
                      </span>
                      <span className="text-xs text-slate-500">{bookResult.time}ms</span>
                   </div>
                   <pre className="bg-slate-900 rounded p-4 text-[11px] text-green-400 overflow-x-auto max-h-64 overflow-y-auto">
                     {JSON.stringify(bookResult.data, null, 2)}
                   </pre>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mt-6 mb-2">Request Body Schema</h3>
              <pre className="bg-slate-100 p-3 rounded-lg text-xs text-slate-800 mb-4">
{`{
  "nameAm": "እየሱስ ያድናል",       // Optional if nameEn is provided
  "nameEn": "Jesus Saves",      // Optional if nameAm is provided
  "applicantName": "Abebe Kebede", // Required
  "phoneNumber": "0911000000",   // Required
  "category": "church"          // "church" | "ministry"
}`}
              </pre>
            </div>
          </Card>
        </div>
      </div>
      
      <div className="text-center text-slate-500 pt-4 pb-12 text-sm">
        <p>Ensure that allowed domains are configured properly if using strict CORS policies.</p>
        <p>Currently configured as <code className="bg-slate-100 px-1 rounded text-slate-700">Access-Control-Allow-Origin: *</code>.</p>
      </div>
    </div>
  );
}
