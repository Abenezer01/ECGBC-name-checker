import React from 'react';
import { Card } from '@/components/ui/components';

export default function ApiDocs() {
  const host = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">API Documentation</h1>
        <p className="text-slate-600">Integrate the Name Checker and Name Booker into your external website.</p>
      </div>

      <Card className="p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b pb-2">1. Name Checker API</h2>
          <p className="text-slate-600 mb-4">
            Check if a church or ministry name already exists or is highly similar to registered names.
          </p>

          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto text-green-400">
            <span className="text-blue-400">POST</span> {host}/api/check
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">Request Body (JSON)</h3>
          <pre className="bg-slate-100 p-4 rounded-lg text-sm text-slate-800">
{`{
  "name": "Your Church Name",
  "category": "church" // or "ministry"
}`}
          </pre>

          <h3 className="text-lg font-semibold mt-6 mb-2">Success Response</h3>
          <pre className="bg-slate-100 p-4 rounded-lg text-sm text-slate-800">
{`{
  "success": true,
  "query": {
    "name": "Your Church Name",
    "category": "church"
  },
  "exactMatchFound": false,
  "candidates": [
    {
      "id": "123",
      "nameAm": "Similar Name Amharic",
      "nameEn": "Similar Name English",
      "registrationId": "CERT-001",
      "status": "High Similarity"
    }
  ]
}`}
          </pre>

          <h3 className="text-lg font-semibold mt-6 mb-2">Example cURL</h3>
          <pre className="bg-slate-900 p-4 rounded-lg text-sm text-slate-300 whitespace-pre-wrap">
{`curl -X POST ${host}/api/check \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Mulu Wongel","category":"church"}'`}
          </pre>
        </div>
      </Card>

      <Card className="p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b pb-2">2. Name Booking API</h2>
          <p className="text-slate-600 mb-4">
            Submit a request to book a new church or ministry name.
          </p>

          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto text-green-400">
            <span className="text-blue-400">POST</span> {host}/api/book
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">Request Body (JSON)</h3>
          <pre className="bg-slate-100 p-4 rounded-lg text-sm text-slate-800">
{`{
  "nameAm": "እየሱስ ያድናል",       // Optional if nameEn is provided
  "nameEn": "Jesus Saves",      // Optional if nameAm is provided
  "applicantName": "Abebe Kebede", // Required
  "phoneNumber": "0911000000",   // Required
  "category": "church"          // "church" or "ministry" (Required)
}`}
          </pre>

          <h3 className="text-lg font-semibold mt-6 mb-2">Success Response</h3>
          <pre className="bg-slate-100 p-4 rounded-lg text-sm text-slate-800">
{`{
  "success": true,
  "message": "Name booking submitted successfully",
  "bookingId": "uuid-here",
  "data": { ... }
}`}
          </pre>

          <h3 className="text-lg font-semibold mt-6 mb-2">Example Node.js (Fetch) Integration</h3>
          <pre className="bg-slate-900 p-4 rounded-lg text-sm text-slate-300 overflow-x-auto">
{`async function submitBooking() {
  const response = await fetch('${host}/api/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nameAm: "የአጥቢያ ቤተክርስቲያን",
      nameEn: "Local Church",
      applicantName: "John Doe",
      phoneNumber: "0912345678",
      category: "church"
    })
  });

  const data = await response.json();
  console.log(data);
}`}
          </pre>
        </div>
      </Card>
      
      <div className="text-center text-slate-500 pt-8 pb-12 text-sm">
        <p>Ensure that allowed domains are configured properly if using strict CORS policies.</p>
        <p>Currently configured as <code className="bg-slate-100 px-1 rounded text-slate-700">Access-Control-Allow-Origin: *</code>.</p>
      </div>
    </div>
  );
}
