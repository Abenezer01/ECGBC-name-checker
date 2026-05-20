'use client';

import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, ChevronRight, User, Phone, MapPin, Settings, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge, cn } from '@/components/ui/components';
import { supabase } from '@/lib/supabase';
import { runAnalysisWorker } from '@/workers/analysis.worker';

export default function PublicDemo() {
  const [masterRecords, setMasterRecords] = useState<any[]>([]);
  const [isMasterLoaded, setIsMasterLoaded] = useState(false);

  React.useEffect(() => {
    async function fetchMasterRecords() {
      if (!supabase) return;
      
      let allRecords: any[] = [];
      let page = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching organizations:', error);
          break;
        }

        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          if (data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      setMasterRecords(allRecords);
      setIsMasterLoaded(true);
    }
    fetchMasterRecords();
  }, []);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'church' | 'ministry'>('church');
  
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  const [isBookingDetails, setIsBookingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
     nameAm: '',
     nameEn: '',
     applicantName: '',
     phoneNumber: ''
  });

  const handleCheck = async () => {
    if (!name.trim()) return;
    setIsChecking(true);
    setCheckResult(null);
    setIsBookingDetails(false);
    setBookingSuccess(false);
    
    try {
      const applicant = [{
          church_name: name,
          applicant_name: 'Quick Check',
          submitted_at: new Date().toISOString()
      }];

      let categoryMasterRecords = masterRecords;
      if (category === 'church') {
         categoryMasterRecords = masterRecords.filter(r => {
             const t = (r.type || r.category || '').toLowerCase();
             return t.includes('church') || !t;
         });
      } else {
         categoryMasterRecords = masterRecords.filter(r => {
             const t = (r.type || r.category || '').toLowerCase();
             return t.includes('ministry');
         });
      }
      
      const rawResults = await runAnalysisWorker(categoryMasterRecords, applicant, () => {});
      
      if (rawResults.length > 0) {
        const r = rawResults[0];
        const exactMatchFound = r.similarity >= 90;
        setCheckResult({
            exactMatchFound,
            candidates: r.closeMatches?.map((c: any) => ({
              nameAm: c.matchAm,
              registrationId: c.registrationId,
              score: c.score,
              ruleFlags: c.ruleFlags
            })) || []
        });
      } else {
        setCheckResult({ exactMatchFound: false, candidates: [] });
      }

      setFormData(prev => ({ 
         ...prev, 
         nameAm: name 
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  };

  const handleBook = async () => {
     setIsSubmitting(true);
     try {
       const res = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             nameAm: formData.nameAm,
             nameEn: formData.nameEn,
             applicantName: formData.applicantName,
             phoneNumber: formData.phoneNumber,
             category
          })
       });
       const data = await res.json();
       if (data.success) {
          setBookingSuccess(true);
          setIsBookingDetails(false);
       } else {
          alert('Registration Failed: ' + (data.error || 'Unknown error') + '\n\n' + (data.details || 'Check your Supabase RLS policies.'));
       }
     } catch (e) {
       console.error("Booking failed", e);
     } finally {
       setIsSubmitting(false);
     }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
           <div className="w-16 h-16 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-sm">
             E
           </div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-6">ECGBC Name Availability</h1>
           <p className="text-slate-500 text-sm">Check if your desired Church or Ministry name is available to register.</p>
        </div>

        {/* Search Box */}
        <Card className="p-6 md:p-8 space-y-6 bg-white shadow-lg border-0 shadow-slate-200/50">
           
           <div className="flex bg-slate-100 p-1 rounded-lg">
             <button 
               onClick={() => setCategory('church')}
               className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", category === 'church' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
               Church Registration
             </button>
             <button 
               onClick={() => setCategory('ministry')}
               className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", category === 'ministry' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
               Ministry Registration
             </button>
           </div>

           <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
             <input
                type="text"
                className="w-full pl-12 pr-4 py-4 text-lg border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-medium placeholder:font-normal text-slate-900"
                placeholder={`Search ${category} name (Amharic or English)...`}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCheck(); }}
             />
           </div>

           <Button 
             className="w-full py-4 text-base rounded-xl font-semibold"
             onClick={handleCheck}
             disabled={isChecking || !name.trim()}
           >
             {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : "Check Availability"}
           </Button>
        </Card>

        {/* Results logic */}
        {checkResult && !isBookingDetails && !bookingSuccess && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {checkResult.exactMatchFound ? (
               <Card className="p-6 border-red-200 bg-red-50 text-center space-y-4">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                  <h3 className="text-xl font-bold text-red-900">Name is Taken</h3>
                  <p className="text-red-700 text-sm max-w-md mx-auto">
                    The name <strong>&quot;{name}&quot;</strong> is already registered or exact match found in our database.
                  </p>
                  
                  <div className="mt-4 space-y-2 text-left">
                    {checkResult.candidates?.slice(0, 3).map((c: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-md border border-red-100 shadow-sm flex items-center justify-between">
                         <div>
                           <p className="font-semibold text-slate-800">{c.nameAm}</p>
                           <p className="text-xs text-slate-500">ID: {c.registrationId || 'N/A'}</p>
                           <div className="flex gap-1 mt-1">
                             {c.ruleFlags?.map((flag: string, i: number) => (
                               <Badge key={i} variant="default" className="text-[9px] bg-red-50 text-red-600">{flag}</Badge>
                             ))}
                           </div>
                         </div>
                         <span className="text-sm font-bold text-red-600">{c.score.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-6 border-red-200 text-red-700 bg-white hover:bg-red-50 hover:text-red-800" onClick={() => setName('')}>Try Another Name</Button>
               </Card>
            ) : (
               <Card className="p-6 md:p-8 border-emerald-200 bg-emerald-50 text-center space-y-5">
                  <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm border border-emerald-100">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-emerald-900 tracking-tight">Name is Available!</h3>
                    <p className="text-emerald-700 mt-2">
                      <strong>&quot;{name}&quot;</strong> looks unique in the <span className="capitalize">{category}</span> category.
                    </p>
                  </div>
                  
                  {checkResult.candidates && checkResult.candidates.length > 0 && (
                    <div className="mt-6 text-left border-t border-emerald-200/50 pt-6">
                      <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-emerald-600" />
                        Similar Names (For your awareness)
                      </h4>
                      <div className="space-y-2">
                        {checkResult.candidates.slice(0, 3).map((c: any, idx: number) => (
                          <div key={idx} className="bg-white/80 p-3 rounded-md border border-emerald-100 shadow-sm flex items-center justify-between">
                             <div>
                               <p className="font-semibold text-slate-800">{c.nameAm}</p>
                               <p className="text-xs text-slate-500">ID: {c.registrationId || 'N/A'}</p>
                               {c.ruleFlags && c.ruleFlags.length > 0 && (
                                 <div className="flex gap-1 mt-1">
                                   {c.ruleFlags.map((flag: string, i: number) => (
                                     <Badge key={i} variant="default" className="text-[9px] bg-slate-100 text-slate-600">{flag}</Badge>
                                   ))}
                                 </div>
                               )}
                             </div>
                             <span className={cn("text-sm font-bold", c.score >= 80 ? "text-amber-600" : "text-emerald-600")}>
                               {c.score.toFixed(0)}%
                             </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full py-4 text-base rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
                    onClick={() => setIsBookingDetails(true)}
                  >
                    Proceed to Registration Request <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
               </Card>
            )}
          </div>
        )}

        {/* Booking Form */}
        {isBookingDetails && !bookingSuccess && (
           <Card className="p-6 md:p-8 space-y-6 border-slate-200 animate-in fade-in slide-in-from-right-8">
              <div>
                 <h3 className="text-xl font-bold text-slate-900">Request Registration</h3>
                 <p className="text-slate-500 text-sm mt-1">Submit your details to reserve the name placeholder.</p>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-sm font-semibold text-slate-700">Name (Amharic) *</label>
                   <input type="text" value={formData.nameAm} onChange={e=>setFormData({...formData, nameAm: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-sm font-semibold text-slate-700">Name (English)</label>
                   <input type="text" value={formData.nameEn} onChange={e=>setFormData({...formData, nameEn: e.target.value})} placeholder="Optional English translation..." className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Applicant Name *</label>
                      <input type="text" value={formData.applicantName} onChange={e=>setFormData({...formData, applicantName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Phone Number *</label>
                      <input type="text" value={formData.phoneNumber} onChange={e=>setFormData({...formData, phoneNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900" />
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                 <Button variant="outline" className="flex-1" onClick={() => setIsBookingDetails(false)}>Back</Button>
                 <Button 
                   className="flex-[2] bg-slate-900 text-white" 
                   onClick={handleBook}
                   disabled={isSubmitting || !formData.applicantName || !formData.phoneNumber || (!formData.nameAm && !formData.nameEn)}
                 >
                   {isSubmitting ? 'Submitting...' : 'Submit Request'}
                 </Button>
              </div>
           </Card>
        )}

        {/* Success Page */}
        {bookingSuccess && (
           <Card className="p-8 text-center space-y-6 border-emerald-200 bg-white">
               <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center">
                 <CheckCircle2 className="w-12 h-12 text-emerald-600" />
               </div>
               <div>
                 <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Request Submitted!</h3>
                 <p className="text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                   Your registration request for <strong>{formData.nameAm || formData.nameEn}</strong> has been sent to the National Office for review.
                 </p>
               </div>

               <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 inline-block max-w-sm mx-auto text-left w-full">
                  <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                     <User className="w-4 h-4" /> {formData.applicantName}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                     <Phone className="w-4 h-4" /> {formData.phoneNumber}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                     <Badge variant="default" className="uppercase font-mono text-[10px] tracking-wider">{category}</Badge>
                  </div>
               </div>

               <div className="pt-6">
                 <Button variant="outline" onClick={() => {
                    setBookingSuccess(false);
                    setCheckResult(null);
                    setName('');
                 }}>Back to Home</Button>
               </div>
           </Card>
        )}

      </div>
    </div>
  );
}
