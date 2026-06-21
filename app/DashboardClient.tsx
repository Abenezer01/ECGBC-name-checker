'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileUp, Settings, Activity, FileDown, CheckCircle2, AlertTriangle, ShieldCheck, Search, Filter, Download, Database, Trash2, UserPlus, Plus, Menu, X, Wifi, WifiOff, Users, Calendar, LayoutGrid, User as UserIcon, Phone, MapPin } from 'lucide-react';
import { Card, Button, ProgressBar, Badge, cn } from '@/components/ui/components';
import { parseFile, downloadCSV, downloadExcel } from '@/lib/file_parser';
import { runAnalysisWorker } from '@/workers/analysis.worker';
import { ReportRow, DatabaseStats } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { MasterRecord } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { initAuth, googleSignIn, getAccessToken, logout } from '@/lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

import { UserMenu } from '@/components/UserMenu';

export default function DashboardClient({ role }: { role: string | null }) {
  const [masterRecords, setMasterRecords] = useState<MasterRecord[]>([]);
  const masterCount = masterRecords?.length || 0;

  React.useEffect(() => {
    fetchMasterRecords();
  }, []);

  async function fetchMasterRecords() {
    if (!supabase) return;
    
    let allRecords: MasterRecord[] = [];
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
  }

  const [applicantData, setApplicantData] = useState<any[]>([]);
  const [results, setResults] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState<DatabaseStats>({ totalChecked: 0, likelyDuplicates: 0, manualReviews: 0, uniqueNames: 0, progress: 0 });
  const [statusText, setStatusText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [applicantFilename, setApplicantFilename] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [masterSearchTerm, setMasterSearchTerm] = useState('');
  const [masterFilterType, setMasterFilterType] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Registry' | 'Upload' | 'Review' | 'Export' | 'Bookings' | 'Users' | 'Roles'>('Dashboard');
  const [onlineBookings, setOnlineBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const [sheetsUrl, setSheetsUrl] = useState('');
  const [isImportingSheets, setIsImportingSheets] = useState(false);
  const [masterSheetsUrl, setMasterSheetsUrl] = useState('');
  const [isImportingMasterSheets, setIsImportingMasterSheets] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);

  const [registryPage, setRegistryPage] = useState(1);
  const REGISTRY_PAGE_SIZE = 100;

  const [singleNameInput, setSingleNameInput] = useState('');
  const [singleCityInput, setSingleCityInput] = useState('');
  const [singleTypeInput, setSingleTypeInput] = useState('');
  const [singleNameResult, setSingleNameResult] = useState<ReportRow | null>(null);
  const [isCheckingSingle, setIsCheckingSingle] = useState(false);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [analyzingBookingId, setAnalyzingBookingId] = useState<string | null>(null);
  const [bookingAnalysisResult, setBookingAnalysisResult] = useState<{booking: any, result: ReportRow} | null>(null);
  const [showBookingAnalysisModal, setShowBookingAnalysisModal] = useState(false);

  const handleAnalyzeBooking = async (booking: any) => {
     setAnalyzingBookingId(booking.id);
     setBookingAnalysisResult(null);
     setShowBookingAnalysisModal(true);
     
     try {
         const applicant = [{
             church_name: booking.church_name_am || booking.church_name_en || '',
             city: '',
             type: booking.category,
             applicant_name: booking.applicant_name,
             submitted_at: new Date().toISOString()
         }];
         
         const rawResults = await runAnalysisWorker(masterRecords, applicant, () => {});
         
         if (rawResults.length > 0) {
             setBookingAnalysisResult({
                 booking,
                 result: rawResults[0],
             });
         }
     } catch(e) {
         showNotification("Analysis failed", "error");
         setShowBookingAnalysisModal(false);
     } finally {
         setAnalyzingBookingId(null);
     }
  };

  const [isOnline, setIsOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Defers state updates asynchronously to prevent cascading synchronous renders
      const currentStatus = navigator.onLine;
      setTimeout(() => {
        setIsOnline(currentStatus);
      }, 0);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setNotification({message, type});
      setTimeout(() => setNotification(null), 3000);
  };

  const masterInputRef = useRef<HTMLInputElement>(null);
  const applicantInputRef = useRef<HTMLInputElement>(null);

  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImporting(true);
      try {
         const data = await parseFile(file);
         
         const existingRecords = masterRecords;
         const existingNames = new Map(existingRecords.map(r => [r.church_name.toLowerCase(), r]));
         const existingIds = new Map(existingRecords.filter(r => r.certificate_no).map(r => [r.certificate_no as string, r]));

         const recordsToAdd: any[] = [];
         
         let newCount = 0;
         let mergedCount = 0;

         const incomingData = data.map((d: any) => {
            const rawName = String(d.church_name || d['church name'] || d.church_name_am || d['የ_ተቋም_ሥም'] || d['የተቋም_ሥም'] || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
            return {
               church_name: rawName,
               certificate_no: String(d.certificate_no || d['certificate no'] || d.registration_id || d.file_number || '').trim(),
               certificate_issued_date: String(d.certificate_issued_date || d['certificate issued date'] || d.registration_date || '').trim(),
               country: String(d.country || d['country'] || '').trim(),
               city: String(d.city || d['city'] || '').trim(),
               type: String(d.type || d['type'] || d.category || '').trim()
            };
         }).filter((d: any) => d.church_name);

         for (const r of incomingData) {
            let existing = existingIds.get(r.certificate_no);
            if (!existing) existing = existingNames.get(r.church_name.toLowerCase());

            if (existing) {
                mergedCount++;
            } else {
                recordsToAdd.push(r);
                if (r.certificate_no) existingIds.set(r.certificate_no, r);
                existingNames.set(r.church_name.toLowerCase(), r);
                newCount++;
            }
         }

         if (recordsToAdd.length > 0 && supabase) {
            const { error } = await supabase.from('organizations').insert(recordsToAdd);
            if (error) throw new Error(error.message);
         }
         
         if (supabase) await fetchMasterRecords();
         showNotification(`Imported ${newCount} new records. Merged/Skipped ${mergedCount} duplicates.`, 'success');
      } catch (err) {
         console.error(err);
         showNotification('Error parsing master file', 'error');
      } finally {
         setIsImporting(false);
         if (masterInputRef.current) masterInputRef.current.value = '';
      }
    }
  };

  const clearRegistry = async () => {
      if (supabase) {
        const { error } = await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (!error) {
           await fetchMasterRecords();
           setResults([]);
           setStats({ totalChecked: 0, likelyDuplicates: 0, manualReviews: 0, uniqueNames: 0, progress: 0 });
           setShowClearConfirm(false);
           showNotification('Registry cleared successfully.', 'success');
        } else {
           showNotification('Failed to clear registry: ' + error.message, 'error');
        }
      }
  };

  const handleApplicantUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setApplicantFilename(file.name);
      try {
         const data = await parseFile(file);
         const mappedData = data.map((d: any) => {
            const rawName = String(d.church_name || d['Church Name'] || d.church_name_am || d['የ_ተቋም_ሥም'] || d['የተቋም_ሥም'] || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
            return {
               church_name: rawName,
               certificate_no: String(d.certificate_no || d['Certificate No'] || d.registration_id || d.file_number || '').trim(),
               applicant_name: String(d.applicant_name || d['የ_ተጠሪ_ሥም'] || d['የተጠሪ_ሥም'] || '').trim(),
               type: String(d.type || d.category || d['Category'] || d['የተቋም_አይነት'] || '').trim(),
               city: String(d.city || d['City'] || d['ከተማ'] || '').trim(),
               submitted_at: new Date().toISOString()
            };
         }).filter((d: any) => d.church_name);
         setApplicantData(mappedData);
         showNotification(`Applicant file loaded with ${mappedData.length} rows.`, 'success');
      } catch (err) {
         showNotification('Error parsing applicant file', 'error');
      }
    }
  };

  const extractSpreadsheetId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const fetchSheetData = async (sheetId: string, sheetTitle: string, token: string) => {
    const dataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetTitle)}!A:Z`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataJSON = await dataRes.json();
    if (dataJSON.error) throw new Error(dataJSON.error.message);
    
    const rows = dataJSON.values;
    if (!rows || rows.length === 0) return [];
    
    const headers = rows[0].map((h: string) => h.trim().toLowerCase());
    return rows.slice(1).map((row: any[]) => {
      const obj: Record<string, string> = {};
      headers.forEach((h: string, i: number) => {
         obj[h] = row[i] || '';
      });
      return obj;
    });
  };

  const handleSheetsImport = async () => {
    if (!sheetsUrl.trim()) return;
    const sheetId = extractSpreadsheetId(sheetsUrl.trim());
    
    setIsImportingSheets(true);
    try {
      const token = await getAccessToken();
      if (!token) {
          setNeedsAuth(true);
          showNotification('Sign in required', 'info');
          setIsImportingSheets(false);
          return;
      }
      
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const metaData = await metaRes.json();
      if (metaData.error) throw new Error(metaData.error.message);
      
      let allMappedData: any[] = [];

      for (const sheet of metaData.sheets) {
        const jsonData = await fetchSheetData(sheetId, sheet.properties.title, token);
        const mappedData = jsonData.map((d: any) => {
            const rawName = String(d.church_name || d['church name'] || d.church_name_am || d['church_name'] || d['የ_ተቋም_ሥም'] || d['የተቋም_ሥም'] || d['church name am'] || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
            return {
               church_name: rawName,
               certificate_no: String(d.certificate_no || d.registration_id || d['certificate_no'] || d['certificate no'] || d['file_number'] || d['file number'] || d['ተራ_ቁ'] || d.no || d.id || '').trim(),
               applicant_name: String(d.applicant_name || d['የ_ተጠሪ_ሥም'] || d['የተጠሪ_ሥም'] || '').trim(),
               type: String(d.type || d.category || d['category'] || d['የተቋም_አይነት'] || '').trim(),
               city: String(d.city || d['City'] || d['ከተማ'] || '').trim(),
               submitted_at: new Date().toISOString()
            };
         }).filter((d: any) => d.church_name);
         allMappedData = allMappedData.concat(mappedData);
      }
      
      if (allMappedData.length === 0) {
         throw new Error('No valid records found in any sheet. Check columns.');
      }

      setApplicantData(allMappedData);
      setApplicantFilename(`Sheets Workspace Imported`);
      showNotification(`Applicant workspace loaded with ${allMappedData.length} records.`, 'success');

    } catch (error: any) {
      showNotification('Error importing from Sheets: ' + error.message, 'error');
    } finally {
      setIsImportingSheets(false);
    }
  };

  const handleMasterSheetsImport = async () => {
    if (!masterSheetsUrl.trim()) return;
    const sheetId = extractSpreadsheetId(masterSheetsUrl.trim());
    
    setIsImportingMasterSheets(true);
    try {
      const token = await getAccessToken();
      if (!token) {
          setNeedsAuth(true);
          showNotification('Sign in required', 'info');
          setIsImportingMasterSheets(false);
          return;
      }
      
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const metaData = await metaRes.json();
      if (metaData.error) throw new Error(metaData.error.message);
      
      const existingRecords = masterRecords;
      const existingNames = new Map(existingRecords.map(r => [r.church_name.toLowerCase(), r]));
      const existingIds = new Map(existingRecords.filter(r => r.certificate_no).map(r => [r.certificate_no as string, r]));

      const recordsToAdd: any[] = [];
      let newCount = 0;
      let mergedCount = 0;

      for (const sheet of metaData.sheets) {
        const jsonData = await fetchSheetData(sheetId, sheet.properties.title, token);
        const mappedData = jsonData.map((d: any) => {
            const rawNameAm = String(d.church_name_am || d.church_name || d['church name'] || d['church_name'] || d['የ_ተቋም_ሥም'] || d['የተቋም_ሥም'] || d['church name am'] || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
            return {
               church_name: rawNameAm,
               certificate_no: String(d.certificate_no || d.registration_id || d['certificate_no'] || d['certificate no'] || d['file_number'] || d['file number'] || d['ተራ_ቁ'] || d.no || d.id || '').trim(),
               certificate_issued_date: String(d.certificate_issued_date || d.registration_date || d['የ_ተመዘገቡበት_ቀን'] || d['የተመዘገቡበት_ቀን'] || '').trim(),
               country: String(d.country || 'Ethiopia').trim(),
               city: String(d.city || '').trim(),
               type: String(d.type || d.category || '').trim()
            };
         }).filter((d: any) => d.church_name);

         for (const r of mappedData) {
            let existing = existingIds.get(r.certificate_no);
            if (!existing) existing = existingNames.get(r.church_name.toLowerCase());

            if (existing) {
                mergedCount++;
            } else {
                recordsToAdd.push(r);
                if (r.certificate_no) existingIds.set(r.certificate_no, r);
                existingNames.set(r.church_name.toLowerCase(), r);
                newCount++;
            }
         }
      }
      
      if (recordsToAdd.length > 0 && supabase) {
         const { error } = await supabase.from('organizations').insert(recordsToAdd);
         if (error) throw new Error(error.message);
      }

      if (supabase) await fetchMasterRecords();
      showNotification(`Imported ${newCount} new records. Merged/Skipped ${mergedCount} duplicates from Sheets.`, 'success');

    } catch (error: any) {
      showNotification('Error importing master from Sheets: ' + error.message, 'error');
    } finally {
      setIsImportingMasterSheets(false);
    }
  };

  const startAnalysis = async () => {
    const localMasterData = masterRecords;
    if (localMasterData.length === 0 || applicantData.length === 0) {
       showNotification("Please ensure the Master Registry has records and an Applicant Spreadsheet is uploaded.", 'error');
       return;
    }
    
    setIsAnalyzing(true);
    setResults([]);
    setStats({ totalChecked: 0, likelyDuplicates: 0, manualReviews: 0, uniqueNames: 0, progress: 0 });
    setStatusText('Waking up worker threads...');

    try {
      const start = performance.now();
      const rawResults = await runAnalysisWorker(localMasterData, applicantData, (progress, status) => {
        setStats(s => ({ ...s, progress }));
        if (status) setStatusText(status);
      });
      const end = performance.now();
      
      let dup = 0, rev = 0, unq = 0;
      rawResults.forEach(r => {
         if (r.matchType === 'Likey Duplicate') dup++;
         else if (r.matchType === 'Needs Manual Review') rev++;
         else unq++;
      });

      setStats({
         totalChecked: rawResults.length,
         likelyDuplicates: dup,
         manualReviews: rev,
         uniqueNames: unq,
         progress: 100
      });
      setStatusText(`Completed in ${((end - start) / 1000).toFixed(1)}s`);
      setResults(rawResults);
    } catch (err) {
      console.error(err);
      setStatusText('Analysis failed: ' + (err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSingleNameCheck = async () => {
     const localMasterData = masterRecords;
     if (!singleNameInput.trim() || localMasterData.length === 0) return;
     
     setIsCheckingSingle(true);
     try {
       const applicant = [{
           church_name: singleNameInput,
           city: singleCityInput,
           type: singleTypeInput,
           applicant_name: 'Quick Check',
           submitted_at: new Date().toISOString()
       }];
       
       const rawResults = await runAnalysisWorker(localMasterData, applicant, () => {});
       
       if (rawResults.length > 0) {
          setSingleNameResult(rawResults[0]);
       }
     } catch (err) {
       console.error("Single check failed", err);
       showNotification("Failed to check single name", 'error');
     } finally {
       setIsCheckingSingle(false);
     }
  };

  const handleAction = (id: string, action: ReportRow['action']) => {
      setResults(prev => prev.map(r => r.id === id ? { ...r, action } : r));
  };

  const exportCSV = () => downloadCSV(results, 'ECGBC_Analysis_Raw.csv');
  const exportExcel = () => downloadExcel(results, 'ECGBC_Conflict_Report.xlsx');
  
  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text("ECGBC Registration Name Checker - Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Total Checked: ${stats.totalChecked} | Duplicates: ${stats.likelyDuplicates} | Reviews: ${stats.manualReviews} | Unique: ${stats.uniqueNames}`, 14, 22);
    
    const tableData = results.map(r => [
      r.submittedName,
      r.closestMatchAm,
      r.closestMatchEn,
      r.similarity.toFixed(1) + '%',
      r.matchType,
      r.action
    ]);

    autoTable(doc, {
      head: [['Submitted Name', 'Match (Am)', 'Match (En)', 'Similarity', 'Classification', 'Review Status']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save('ECGBC_Conflict_Report.pdf');
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const sessionRes = await supabase?.auth.getSession();
      const session = sessionRes?.data?.session;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/users', { headers });
      const data = await res.json();
      if (data.users) {
        setSystemUsers(data.users);
        if (data.error) showNotification("Alert: " + data.error, 'info');
      } else {
        if (data.error) showNotification(data.error, 'error');
      }
    } catch(err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const updateUserRole = async (id: string, newRole: 'admin' | 'user') => {
    try {
      const sessionRes = await supabase?.auth.getSession();
      const session = sessionRes?.data?.session;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, newRole })
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Role updated successfully", 'success');
        setSystemUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      } else {
        showNotification(data.error || "Failed to update role", 'error');
      }
    } catch(err: any) {
      showNotification(err.message, 'error');
    }
  };

  const addUser = async (email: string, targetRole: string) => {
    try {
      const sessionRes = await supabase?.auth.getSession();
      const session = sessionRes?.data?.session;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Generate a default premium password, showing standard feedback
      const defaultPassword = "ecgbcTempPassword123!";

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password: defaultPassword, role: targetRole })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`User added successfully! Default temporary password: ${defaultPassword}`, 'success');
        if (data.error) showNotification("Alert: " + data.error, 'info');
        fetchUsers();
      } else {
        showNotification(data.error || "Failed to create user", 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete administrative access for ${email}?`)) return;
    try {
      const sessionRes = await supabase?.auth.getSession();
      const session = sessionRes?.data?.session;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (data.success) {
        showNotification("User removed successfully", 'success');
        setSystemUsers(prev => prev.filter(u => u.id !== id));
      } else {
        showNotification(data.error || "Failed to delete user", 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const [bookingAssessments, setBookingAssessments] = useState<{ [id: string]: ReportRow }>({});
  const [isAssessingBookings, setIsAssessingBookings] = useState(false);

  // Auto-assess bookings when onlineBookings changes
  React.useEffect(() => {
     if (onlineBookings.length > 0 && masterRecords.length > 0 && activeTab === 'Bookings') {
         const pendingBookings = onlineBookings.filter(b => b.status === 'pending' && !bookingAssessments[b.id]);
         if (pendingBookings.length > 0) {
             const assessPending = async () => {
                 setIsAssessingBookings(true);
                 try {
                     const applicants = pendingBookings.map(b => ({
                         church_name: b.church_name_am || b.church_name_en || '',
                         city: '',
                         type: b.category,
                         applicant_name: b.applicant_name,
                         submitted_at: new Date().toISOString(),
                         _id: b.id // keep track
                     }));
                     
                     const results = await runAnalysisWorker(masterRecords, applicants, () => {});
                     setBookingAssessments(prev => {
                         const next = { ...prev };
                         results.forEach((r, idx) => {
                             const b = pendingBookings[idx];
                             if (b) next[b.id] = r;
                         });
                         return next;
                     });
                 } catch (e) {
                     console.error("Auto-assessment failed", e);
                 } finally {
                     setIsAssessingBookings(false);
                 }
             };
             assessPending();
         }
     }
  }, [onlineBookings, masterRecords, activeTab]);

  const fetchBookings = async () => {
     setIsLoadingBookings(true);
     try {
       const sessionRes = await supabase?.auth.getSession();
       const session = sessionRes?.data?.session;
       const headers: HeadersInit = { 'Content-Type': 'application/json' };
       if (session?.access_token) {
         headers['Authorization'] = `Bearer ${session.access_token}`;
       }

       const res = await fetch('/api/admin/bookings', { headers });
       const data = await res.json();
       if (data.bookings) {
         setOnlineBookings(data.bookings);
         if (data.error) showNotification("Alert: " + data.error, 'info');
       } else {
         showNotification(data.error || "Could not load bookings.", 'error');
       }
     } catch (e: any) {
       showNotification("Error loading bookings: " + e.message, 'error');
     } finally {
       setIsLoadingBookings(false);
     }
  };

  const updateBookingStatus = async (id: string, status: 'approved' | 'rejected') => {
     try {
        const sessionRes = await supabase?.auth.getSession();
        const session = sessionRes?.data?.session;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/admin/bookings', {
           method: 'PUT',
           headers,
           body: JSON.stringify({ id, status })
        });
        const data = await res.json();
        
        if (data.success) {
           showNotification(`Booking ${status} successfully.`, 'success');
           setOnlineBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
           
           // Mock syncing to master registry if approved
           if (status === 'approved' && supabase) {
              const b = onlineBookings.find(x => x.id === id);
              if (b) {
                  await supabase.from('organizations').insert([{
                     church_name: b.church_name_am || '',
                     certificate_no: '',
                     certificate_issued_date: '',
                     country: '',
                     city: '',
                     type: b.category,
                  }]);
                  await fetchMasterRecords();
              }
           }
        } else {
           showNotification(data.error || 'Failed to update booking status', 'error');
        }
     } catch (e) {
        showNotification("Error connecting to server.", 'error');
     }
  };

  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const sessionRes = await supabase?.auth.getSession();
      const session = sessionRes?.data?.session;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/roles', { headers });
      const data = await res.json();
      if (data.roles) {
        setRoles(data.roles);
        if (data.warning) showNotification(data.warning, 'info');
      } else if (data.error) {
        showNotification(data.error, 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const saveRole = async (roleData: { name: string, description: string, id?: string }) => {
    try {
      const sessionRes = await supabase?.auth.getSession();
      const session = sessionRes?.data?.session;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/roles', {
         method: 'POST',
         headers,
         body: JSON.stringify(roleData)
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Role saved successfully", 'success');
        fetchRoles();
      } else {
        showNotification(data.error, 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      const sessionRes = await supabase?.auth.getSession();
      const session = sessionRes?.data?.session;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/admin/roles?id=${id}`, {
         method: 'DELETE',
         headers
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Role deleted", 'success');
        fetchRoles();
      } else {
        showNotification(data.error, 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  React.useEffect(() => {
     if (activeTab === 'Bookings' && onlineBookings.length === 0) {
        const fetchInitialBookings = async () => {
           await fetchBookings();
        };
        fetchInitialBookings();
     }
     if (activeTab === 'Users' && systemUsers.length === 0) {
        const fetchInitialUsers = async () => {
           await fetchUsers();
           await fetchRoles(); // Also fetch roles to populate dropdowns
        };
        fetchInitialUsers();
     }
     if (activeTab === 'Roles' && roles.length === 0) {
        const fetchInitialRoles = async () => {
           await fetchRoles();
        };
        fetchInitialRoles();
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  React.useEffect(() => {
    initAuth(
      (user) => { setAuthUser(user); setNeedsAuth(false); },
      () => { setAuthUser(null); setNeedsAuth(true); }
    );
  }, []);

  const filteredResults = useMemo(() => {
     let r = results;
     if (filterType !== 'All') r = r.filter(x => x.matchType === filterType);
     if (searchTerm) r = r.filter(x => x.submittedName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                       String(x.registrationId).toLowerCase().includes(searchTerm.toLowerCase()));
     return r;
  }, [results, searchTerm, filterType]);

  const filteredMasterRecords = useMemo(() => {
     let r = masterRecords;
     if (masterFilterType !== 'All') r = r.filter(x => (x.type || 'church').toLowerCase() === masterFilterType.toLowerCase());
     if (masterSearchTerm) {
        const term = masterSearchTerm.toLowerCase();
        r = r.filter(x => 
           (x.church_name && x.church_name.toLowerCase().includes(term)) || 
           (x.certificate_no && String(x.certificate_no).toLowerCase().includes(term)) ||
           (x.city && x.city.toLowerCase().includes(term))
        );
     }
     return r;
  }, [masterRecords, masterSearchTerm, masterFilterType]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans flex flex-col antialiased">
      {/* Dynamic Top Header Navigation with Glassmorphism and Micro-interactions */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/55 dark:border-slate-800/40 px-4 md:px-8 lg:px-12 py-3 flex items-center justify-between transition-all duration-300">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 group shrink-0">
          <div className="relative h-10 w-10 bg-slate-900 dark:bg-slate-100 rounded-xl flex items-center justify-center font-bold text-white dark:text-slate-900 shadow-md hover:scale-105 transition-transform duration-300">
            <span className="text-base select-none">E</span>
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-extrabold text-white shadow-xs animate-bounce">
              ✓
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">ECGBC Name Portal</h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100/30">
                v1.2
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">National Alliance Registry</p>
          </div>
        </div>

        {/* Desktop & Larger Laptop Tabs Menu */}
        <nav className="hidden lg:flex items-center gap-2 flex-1 justify-start ml-8">
          {/* Main User Portal Tabs */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => { setActiveTab('Dashboard'); setMobileMenuOpen(false); }} 
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer", 
                activeTab === 'Dashboard' 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Verification</span>
            </button>

            <button 
              onClick={() => { setActiveTab('Registry'); setMobileMenuOpen(false); }} 
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer", 
                activeTab === 'Registry' 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Database className="h-4 w-4" />
              <span>Registry</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-tight transition-colors flex items-center justify-center", 
                activeTab === 'Registry' 
                  ? "bg-white/20 text-white" 
                  : "bg-slate-200 text-slate-600"
              )}>
                {masterCount}
              </span>
            </button>

            <button 
              onClick={() => { setActiveTab('Bookings'); setMobileMenuOpen(false); }} 
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer", 
                activeTab === 'Bookings' 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span>Bookings</span>
            </button>
          </div>

          {/* admin Section - Rendered Side-by-Side but distinct */}
          {role === 'admin' && (
            <>
              <div className="h-5 w-px bg-slate-200 mx-1"></div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => { setActiveTab('Upload'); setMobileMenuOpen(false); }} 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer", 
                    activeTab === 'Upload' 
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm" 
                      : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  <span>Importer</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('Users'); setMobileMenuOpen(false); }} 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer", 
                    activeTab === 'Users' 
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm" 
                      : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                  )}
                >
                  <Users className="h-4 w-4" />
                  <span>Users</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('Roles'); setMobileMenuOpen(false); }} 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer", 
                    activeTab === 'Roles' 
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm" 
                      : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span>Roles</span>
                </button>
                <a 
                  href="/api-docs"
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all duration-200"
                >
                  <Search className="h-4 w-4" />
                  <span>API Docs</span>
                </a>
              </div>
            </>
          )}
        </nav>

        {/* Right Actions Block */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Reactive Connectivity Engine */}
          <div className={cn(
            "hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-300 shadow-3xs hover:scale-102",
            isOnline 
              ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 animate-pulse"
          )}>
            <span className="relative flex h-1.5 w-1.5">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isOnline ? "bg-emerald-400" : "bg-amber-400"
              )}></span>
              <span className={cn(
                "relative inline-flex rounded-full h-1.5 w-1.5",
                isOnline ? "bg-emerald-500" : "bg-amber-500"
              )}></span>
            </span>
            <span className="select-none">{isOnline ? 'Database Live' : 'Offline Mode'}</span>
          </div>

          {/* User Profile dropdown */}
          <div className="flex items-center pl-1 border-l border-slate-200/65 dark:border-slate-800/50 gap-2.5">
            <UserMenu />
          </div>

          {/* Mobile responsive hamburger menu button */}
          <button 
            type="button" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Dynamic Animated Mobile Menu Sheet Dropdown */}
      <div className={cn(
        "lg:hidden overflow-hidden transition-all duration-300 ease-in-out border-b border-slate-200/60 dark:border-slate-800/30 bg-white dark:bg-slate-950/95 shadow-lg",
        mobileMenuOpen ? "max-h-[420px] py-4 px-5 opacity-100" : "max-h-0 py-0 px-5 opacity-0 pointer-events-none"
      )}>
        <div className="flex flex-col space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1 select-none">
              Client Portal
            </div>
            
            <button 
              onClick={() => { setActiveTab('Dashboard'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                activeTab === 'Dashboard' 
                  ? "bg-slate-900 text-white dark:bg-slate-150 dark:text-slate-900 shadow-xs" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
              )}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span>Verification</span>
            </button>

            <button 
              onClick={() => { setActiveTab('Registry'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                activeTab === 'Registry' 
                  ? "bg-slate-900 text-white dark:bg-slate-150 dark:text-slate-900 shadow-xs" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
              )}
            >
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 shrink-0" />
                <span>Master Registry</span>
              </div>
              <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {masterCount}
              </span>
            </button>

            <button 
              onClick={() => { setActiveTab('Bookings'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                activeTab === 'Bookings' 
                  ? "bg-slate-900 text-white dark:bg-slate-150 dark:text-slate-900 shadow-xs" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
              )}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Online Bookings</span>
            </button>
          </div>

          {role === 'admin' && (
            <div className="border-t border-slate-200/60 dark:border-slate-800/50 pt-3 space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 mb-1 select-none">
                Administration Portal
              </div>

              <button 
                onClick={() => { setActiveTab('Upload'); setMobileMenuOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                  activeTab === 'Upload' 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                )}
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span>Importer</span>
              </button>

              <button 
                onClick={() => { setActiveTab('Users'); setMobileMenuOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                  activeTab === 'Users' 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                )}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Users</span>
              </button>

              <button 
                onClick={() => { setActiveTab('Roles'); setMobileMenuOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                  activeTab === 'Roles' 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-indigo-600 dark:text-indigo-450 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Roles</span>
              </button>

              <a 
                href="/api-docs"
                target="_blank"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50/50 transition-all cursor-pointer"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span>API Docs</span>
              </a>
            </div>
          )}

          {/* Connection status on mobile inline */}
          <div className="flex sm:hidden items-center justify-between border-t border-slate-200/60 dark:border-slate-800/50 pt-3 text-xs text-slate-500">
            <span>Status:</span>
            <span className={cn(
              "font-semibold flex items-center gap-1.5",
              isOnline ? "text-emerald-600 animate-pulse" : "text-amber-600"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500")}></span>
              {isOnline ? 'Active Sync' : 'Offline Area'}
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-6 flex flex-col">
        {notification && (
          <div className={cn("fixed top-20 right-6 z-50 text-xs font-bold px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-top-4", notification.type === 'error' ? "bg-red-50 text-red-800 border-red-200" : "bg-green-50 text-green-800 border-green-200")}>
            {notification.message}
          </div>
        )}

        {/* Dynamic Product Hero Page Banner */}
        <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-8 shadow-sm flex-shrink-0">
          <div className="max-w-3xl space-y-3">
            <Badge variant="default">Phonetic Spelling Aligners</Badge>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 leading-tight">Evangelical Churches Name Verification</h2>
            <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
              Protecting database registration legitimacy across the fellowship. Match Amharic and English phonetics, resolve transliteration variations, and check spreadsheet submissions offline.
            </p>
          </div>
        </div>

        {activeTab === 'Dashboard' && (
          <>
            {/* Elegant Metrical Counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-xs font-medium text-slate-500 block mb-1">Names Checked</span>
                <span className="text-2xl font-semibold text-slate-900">{stats.totalChecked}</span>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-xs font-medium text-red-600 block mb-1">Likely Duplicates</span>
                <span className="text-2xl font-semibold text-slate-900">{stats.likelyDuplicates}</span>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-xs font-medium text-amber-600 block mb-1">Manual Reviews</span>
                <span className="text-2xl font-semibold text-slate-900">{stats.manualReviews}</span>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-xs font-medium text-emerald-600 block mb-1">Clear & Safe</span>
                <span className="text-2xl font-semibold text-slate-900">{stats.uniqueNames}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-shrink-0">
              {/* Quick Check Panel */}
              <Card className="p-6">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-slate-500" /> Single Query Align
                </h3>
                <p className="text-sm text-slate-500 mb-6">Check spelling candidates instantly against our master offline records.</p>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-400 bg-white shadow-sm"
                      placeholder="Organization Name (Amharic/English)"
                      value={singleNameInput}
                      onChange={e => setSingleNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSingleNameCheck(); }}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-400 bg-white shadow-sm"
                        placeholder="City / Region"
                        value={singleCityInput}
                        onChange={e => setSingleCityInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSingleNameCheck(); }}
                      />
                      <input
                        type="text"
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-400 bg-white shadow-sm"
                        placeholder="Type (e.g. Church, Ministry)"
                        value={singleTypeInput}
                        onChange={e => setSingleTypeInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSingleNameCheck(); }}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={isCheckingSingle || masterCount === 0 || !singleNameInput.trim()}
                    onClick={handleSingleNameCheck}
                  >
                    {isCheckingSingle ? 'Processing...' : 'Run Word Alignment'}
                  </Button>

                  {singleNameResult && (
                    <div className="mt-6 space-y-3">
                      <p className="text-xs font-medium text-slate-500">Candidate Matches</p>
                      {singleNameResult.closeMatches && singleNameResult.closeMatches.length > 0 ? (
                        singleNameResult.closeMatches.slice(0, 3).map((match, idx) => (
                          <div key={idx} className={cn("p-4 rounded-md border text-sm", idx === 0 ? "bg-slate-50 border-slate-200" : "bg-white border-slate-100")}>
                            {idx === 0 && <Badge variant="default" className="mb-2">Top Match</Badge>}
                            <p className="font-medium text-slate-900">{match.matchAm || 'N/A'}</p>
                            {match.matchEn && <p className="text-slate-500 text-xs mt-1">{match.matchEn}</p>}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {match.ruleFlags?.map((flag, fIdx) => (
                                <Badge key={fIdx} variant="default" className={cn("text-[10px] font-medium border", flag.includes('(+') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : flag.includes('(-') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-700 border-slate-200')}>
                                  {flag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200/60">
                              <span className={cn('text-xs font-semibold', match.score >= 90 ? 'text-red-600' : match.score >= 75 ? 'text-amber-600' : 'text-slate-600')}>{match.score.toFixed(1)}% Match</span>
                              {match.registrationId && match.registrationId !== 'N/A' && <span className="text-xs text-slate-400">ID: {match.registrationId}</span>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-slate-50 text-slate-500 rounded-md border border-slate-200 text-center text-sm">No matching candidates found</div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Engine Stats Monitor */}
              <Card className="p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Settings className={cn("w-4 h-4 text-slate-500", isAnalyzing && "animate-spin")} /> Engine Live Progress
                  </h3>
                  <div className="flex items-start gap-3 bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                    <Activity className={cn("w-5 h-5 text-slate-400 mt-0.5", isAnalyzing && "animate-pulse")} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Similarity Match Processing state</p>
                      <p className="text-sm text-slate-500 mt-1">{statusText || (applicantFilename ? 'Awaiting analysis triggers' : 'Load check spreadsheet inside Importer tab to list records')}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <ProgressBar progress={stats.progress} label="Processing Completion" />
                </div>
              </Card>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => window.open('/demo', '_blank')} variant="outline" className="text-slate-700 bg-white shadow-sm">
                Open Public Check & Book Portal Demo
              </Button>
            </div>

            {/* Verification ledger */}
            {results.length > 0 && (
              <Card className="flex flex-col overflow-hidden min-h-[480px]">
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4 flex-shrink-0">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">Identified Conflict Matches</h4>
                    <p className="text-sm text-slate-500 mt-1">Filter items and resolve candidates dynamically</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                    <div className="relative w-full sm:w-auto">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search names..."
                        className="text-sm border border-slate-200 rounded-md pl-9 pr-3 py-1.5 w-full sm:w-64 outline-none focus:ring-1 focus:ring-slate-400 bg-white shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="text-sm font-medium bg-white border border-slate-200 px-3 py-1.5 rounded-md outline-none focus:ring-1 focus:ring-slate-400 shadow-sm cursor-pointer"
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                    >
                      <option value="All">All Classifications</option>
                      <option value="Likey Duplicate">Likely Duplicates</option>
                      <option value="Needs Manual Review">Needs Review</option>
                      <option value="Unique">Safe / Unique</option>
                    </select>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-2" /> Excel</Button>
                      <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> CSV</Button>
                      <Button variant="outline" size="sm" onClick={exportPDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1 h-full">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="px-6 py-3 font-medium">Submitted Name</th>
                        <th className="px-6 py-3 font-medium">Best Candidate Match</th>
                        <th className="px-6 py-3 text-center font-medium">Score</th>
                        <th className="px-6 py-3 text-center font-medium">Classification</th>
                        <th className="px-6 py-3 text-center font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResults.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium max-w-[200px] truncate text-slate-900" title={r.submittedName}>
                            {r.submittedName}
                            {r.applicantName && <p className="text-xs text-slate-500 mt-1 truncate">Applicant: {r.applicantName}</p>}
                          </td>
                          <td className="px-6 py-4 text-slate-600 max-w-[250px] truncate" title={r.closestMatchAm || r.closestMatchEn}>
                            <div className="text-slate-900 font-medium">{r.closestMatchAm || 'N/A'}</div>
                            {r.closestMatchEn && <p className="text-xs text-slate-500 mt-1 truncate">{r.closestMatchEn}</p>}
                            {r.registrationId && r.registrationId !== 'N/A' && <p className="text-xs text-slate-500 mt-0.5 font-mono">ID: {r.registrationId}</p>}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className={cn('text-sm font-medium', r.similarity >= 90 ? 'text-red-600' : r.similarity >= 75 ? 'text-amber-600' : 'text-slate-600')}>
                              {r.similarity.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <Badge variant={r.matchType === 'Likey Duplicate' ? 'danger' : r.matchType === 'Needs Manual Review' ? 'warning' : 'default'}>
                              {r.matchType === 'Likey Duplicate' ? 'Duplicate' : r.matchType === 'Needs Manual Review' ? 'Review' : 'Unique'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <select
                              className={cn(
                                "text-sm font-medium py-1.5 px-3 rounded-md border focus:ring-1 focus:ring-slate-400 outline-none cursor-pointer shadow-sm transition-all",
                                r.action === 'Pending' ? "bg-white border-slate-200 text-slate-700" :
                                r.action === 'Approved' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                r.action === 'Duplicate' ? "bg-red-50 border-red-200 text-red-700" :
                                r.action === 'Escalate' ? "bg-amber-50 border-amber-200 text-amber-700" :
                                "bg-slate-50 border-slate-200 text-slate-700"
                              )}
                              value={r.action}
                              onChange={(e) => handleAction(r.id, e.target.value as ReportRow['action'])}
                            >
                              <option value="Pending">Pending Review</option>
                              <option value="Approved">Approved / Clear</option>
                              <option value="Duplicate">Flag Duplicate</option>
                              <option value="Escalate">Escalate Case</option>
                              <option value="Ignore">Ignore Issue</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {filteredResults.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">No entries fit current filtering credentials.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === 'Upload' && (
          <div className="grid grid-cols-1 gap-6 max-w-3xl">
            <Card className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-slate-500" /> Batch Match submissions Importer
                </h3>
                <p className="text-sm text-slate-500 mt-1">Configure bulk evaluations of prospective church name registrations offline.</p>
              </div>

              {/* Compact Drop Zone */}
              <div className="border border-dashed border-slate-300 rounded-lg bg-slate-50/50 p-8 text-center flex flex-col items-center justify-center space-y-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => applicantInputRef.current?.click()}>
                <div className="p-3 bg-white border border-slate-200 text-slate-600 rounded-full shadow-sm"><Upload className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Select candidate list</p>
                  <p className="text-xs text-slate-500 mt-1 text-center">Accepting files formatted in CSV or Excel spreadsheets</p>
                </div>
                <div className="flex flex-col items-center gap-2 pt-2">
                  {applicantFilename && !applicantFilename.startsWith('Sheets:') ? (
                    <div className="bg-white px-3 py-1.5 text-sm text-slate-700 font-medium border border-slate-200 rounded-md font-mono shadow-sm">
                      {applicantFilename} <span className="text-slate-400 ml-1">({applicantData.length} records)</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">Click or drag file to upload</span>
                  )}
                </div>
                <input type="file" ref={applicantInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleApplicantUpload} />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">or import from workspace</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                   <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5zm2-12h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
                   Google Sheets Import
                </p>
                {needsAuth ? (
                   <button onClick={async () => {
                      const res = await googleSignIn();
                      if (res) { setAuthUser(res.user); setNeedsAuth(false); }
                   }} className="gsi-material-button w-full sm:w-auto">
                     <div className="gsi-material-button-state"></div>
                     <div className="gsi-material-button-content-wrapper p-2 bg-white border border-slate-200 rounded shadow-sm flex items-center gap-3 hover:bg-slate-50 transition-colors">
                       <div className="gsi-material-button-icon">
                         <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                           <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                           <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                           <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                           <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                         </svg>
                       </div>
                       <span className="text-sm font-medium text-slate-700">Sign in to import from Workspace</span>
                     </div>
                   </button>
                ) : (
                   <div className="flex flex-col sm:flex-row gap-2">
                     <input 
                       type="text" 
                       className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                       placeholder="Paste Google Sheets URL or ID..." 
                       value={sheetsUrl}
                       onChange={e => setSheetsUrl(e.target.value)}
                     />
                     <Button 
                       disabled={isImportingSheets || !sheetsUrl} 
                       onClick={handleSheetsImport}
                       className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                     >
                       {isImportingSheets ? 'Fetching...' : 'Import Sheet'}
                     </Button>
                   </div>
                )}
                {applicantFilename && applicantFilename.startsWith('Sheets:') && (
                   <div className="mt-2 inline-flex bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 font-medium border border-emerald-200 rounded-md font-mono shadow-sm">
                      {applicantFilename} <span className="opacity-70 ml-1">({applicantData.length} records)</span>
                   </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Spelling Align Schema keys</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono text-slate-500 text-center">
                  <div className="bg-white p-2 text-[10px] sm:text-xs rounded-md border border-slate-200 font-medium text-slate-900">ተራ ቁ (Serial)</div>
                  <div className="bg-white p-2 text-[10px] sm:text-xs rounded-md border border-slate-200 font-medium text-slate-900">የ ተቋም ሥም <br/>(Church Name)</div>
                  <div className="bg-white p-2 text-[10px] sm:text-xs rounded-md border border-slate-200">የ ተመዘገቡበት ቀን <br/>(Registration Date)</div>
                  <div className="bg-white p-2 text-[10px] sm:text-xs rounded-md border border-slate-200">የ ተጠሪ ሥም <br/>(Applicant)</div>
                  <div className="bg-white p-2 text-[10px] sm:text-xs rounded-md border border-slate-200">ስልክ ቁጥር <br/>(Phone)</div>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={isAnalyzing || masterCount === 0 || applicantData.length === 0}
                onClick={async () => { await startAnalysis(); setActiveTab('Dashboard'); }}
              >
                {isAnalyzing ? "Comparing entries..." : "Compute Standalone Alignment Engine"}
              </Button>
            </Card>
          </div>
        )}

        {activeTab === 'Registry' && (
          <div className="space-y-6 flex flex-col flex-1 min-h-[500px]">
            <div className="flex flex-col gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 text-slate-500 border border-slate-200 rounded-md shadow-sm"><Database className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">National Directory Local Datastore</h3>
                    <p className="text-sm text-slate-500">Standalone index: <span className="font-medium text-slate-900">{masterCount} registered names</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                  {showClearConfirm ? (
                    <div className="flex items-center gap-2 bg-red-50 p-2 rounded-md border border-red-100">
                      <span className="text-sm font-medium text-red-600 mr-2">Reset Database?</span>
                      <Button variant="danger" size="sm" onClick={clearRegistry}>Confirm</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setShowClearConfirm(true)}>Clear Storage</Button>
                  )}

                  <Button size="sm" onClick={() => masterInputRef.current?.click()} disabled={isImporting}>
                    {isImporting ? 'Syncing...' : 'Upload Master File'}
                  </Button>
                  <input type="file" ref={masterInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleMasterUpload} />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                   <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5zm2-12h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
                   Google Sheets Import
                </p>
                {needsAuth ? (
                   <button onClick={async () => {
                      const res = await googleSignIn();
                      if (res) { setAuthUser(res.user); setNeedsAuth(false); }
                   }} className="gsi-material-button w-full sm:w-auto">
                     <div className="gsi-material-button-state"></div>
                     <div className="gsi-material-button-content-wrapper p-2 bg-white border border-slate-200 rounded shadow-sm flex items-center gap-3 hover:bg-slate-50 transition-colors">
                       <div className="gsi-material-button-icon">
                         <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                           <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                           <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                           <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                           <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                         </svg>
                       </div>
                       <span className="text-sm font-medium text-slate-700">Sign in to import from Workspace</span>
                     </div>
                   </button>
                ) : (
                   <div className="flex flex-col sm:flex-row gap-2">
                     <input 
                       type="text" 
                       className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                       placeholder="Paste Google Sheets URL or ID..." 
                       value={masterSheetsUrl}
                       onChange={e => setMasterSheetsUrl(e.target.value)}
                     />
                     <Button 
                       disabled={isImportingMasterSheets || !masterSheetsUrl} 
                       onClick={handleMasterSheetsImport}
                       className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                     >
                       {isImportingMasterSheets ? 'Syncing...' : 'Import All Sheets'}
                     </Button>
                   </div>
                )}
              </div>
            </div>

            <Card className="flex flex-col overflow-hidden min-h-[480px]">
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Active Registry Preview</h4>
                  <p className="text-sm text-slate-500 mt-1">Showing {Math.min(filteredMasterRecords.length, (registryPage - 1) * REGISTRY_PAGE_SIZE + 1)} - {Math.min(filteredMasterRecords.length, registryPage * REGISTRY_PAGE_SIZE)} of {filteredMasterRecords.length} records</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Search name, reg no, city..." 
                        value={masterSearchTerm}
                        onChange={(e) => {
                          setMasterSearchTerm(e.target.value);
                          setRegistryPage(1);
                        }}
                        className="pl-9 pr-3 py-2 text-sm w-full border border-slate-200 rounded-md outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                      />
                    </div>
                    <select 
                      className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
                      value={masterFilterType}
                      onChange={(e) => {
                        setMasterFilterType(e.target.value);
                        setRegistryPage(1);
                      }}
                    >
                      <option value="All">All Categories</option>
                      <option value="Church">Church</option>
                      <option value="Ministry">Ministry</option>
                    </select>
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-medium z-10">
                    <tr>
                      <th className="px-6 py-3 font-medium">Registration UID</th>
                      <th className="px-6 py-3 font-medium">Structure (Amharic)</th>
                      <th className="px-6 py-3 font-medium">Region/Country</th>
                      <th className="px-6 py-3 font-medium">Category</th>
                      <th className="px-6 py-3 font-medium">City / Issued Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredMasterRecords.slice((registryPage - 1) * REGISTRY_PAGE_SIZE, registryPage * REGISTRY_PAGE_SIZE).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 text-slate-500 font-mono text-xs">{r.certificate_no || 'N/A'}</td>
                        <td className="px-6 py-3 text-slate-900 font-medium">{r.church_name}</td>
                        <td className="px-6 py-3 text-slate-500">{r.country || '-'}</td>
                        <td className="px-6 py-3 text-slate-500 capitalize">{r.type || 'church'}</td>
                        <td className="px-6 py-3 text-slate-400 font-mono text-xs">{r.city || '-'} / {r.certificate_issued_date || '-'}</td>
                      </tr>
                    ))}
                    {masterCount === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No master names configured. Upload a record set to mount.</td>
                      </tr>
                    )}
                    {masterCount > 0 && filteredMasterRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No records match your search criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination controls */}
              {filteredMasterRecords.length > 0 && (
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="text-sm text-slate-500 font-medium">
                    Page {registryPage} of {Math.max(1, Math.ceil(filteredMasterRecords.length / REGISTRY_PAGE_SIZE))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={registryPage === 1}
                      onClick={() => setRegistryPage(p => p - 1)}
                      className="bg-white"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={registryPage >= Math.ceil(filteredMasterRecords.length / REGISTRY_PAGE_SIZE)}
                      onClick={() => setRegistryPage(p => p + 1)}
                      className="bg-white"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'Bookings' && (
          <div className="space-y-6 flex flex-col flex-1 min-h-[500px]">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-md shadow-sm">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Online Booking Requests</h3>
                  <p className="text-sm text-slate-500">Incoming requests from external website integration.</p>
                </div>
              </div>

              <div className="flex gap-2">
                 <Button size="sm" onClick={fetchBookings} disabled={isLoadingBookings}>
                   {isLoadingBookings ? 'Refreshing...' : 'Refresh Bookings'}
                 </Button>
              </div>
            </div>

            <Card className="flex flex-col overflow-hidden min-h-[480px]">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-medium z-10">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Registration Details & Similar Names</th>
                      <th className="px-6 py-3 font-medium hidden md:table-cell">Category</th>
                      <th className="px-6 py-3 font-medium">Applicant Details</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {onlineBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                           No bookings found. Ensure Supabase is configured and bookings exist.
                        </td>
                      </tr>
                    ) : (
                      onlineBookings.map((b) => {
                        const assessment = bookingAssessments[b.id];
                        return (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 text-slate-500 text-xs whitespace-nowrap align-top">
                             {new Date(b.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 align-top">
                             <div className="font-bold text-slate-900 text-base">{b.church_name_am || '—'}</div>
                             {b.church_name_en && <div className="text-slate-500 text-xs mt-0.5">{b.church_name_en}</div>}
                             
                             {/* Auto Analysis Preview */}
                             {b.status === 'pending' && (
                               <div className="mt-3">
                                 {!assessment ? (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                       <Activity className="w-3.5 h-3.5 animate-pulse" /> Auto-analyzing registry...
                                    </div>
                                 ) : assessment.matchType === 'Unique' ? (
                                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-md text-xs shadow-sm">
                                       <CheckCircle2 className="w-3.5 h-3.5" /> No Conflicts ({assessment.similarity.toFixed(0)}% max match)
                                    </div>
                                 ) : (
                                    <div className={cn("space-y-2 border rounded-xl p-3 shadow-sm mt-2 max-w-sm", assessment.matchType === 'Likey Duplicate' ? "bg-red-50/50 border-red-200" : "bg-amber-50/50 border-amber-200")}>
                                      <div className={cn("text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider", assessment.matchType === 'Likey Duplicate' ? "text-red-800" : "text-amber-800")}>
                                         <AlertTriangle className="w-3.5 h-3.5" /> {assessment.matchType === 'Likey Duplicate' ? 'High Risk' : 'Similar Names Found'}
                                      </div>
                                      <div className="space-y-1.5">
                                        {assessment.closeMatches?.slice(0, 2).map((cm: any, idx: number) => (
                                          <div key={idx} className="flex justify-between items-start gap-2 bg-white px-2.5 py-2 rounded-lg border border-slate-100 shadow-sm">
                                             <div>
                                               <p className="text-xs font-semibold text-slate-900 truncate max-w-[150px]" title={cm.matchAm}>{cm.matchAm}</p>
                                               <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {cm.registrationId}</p>
                                             </div>
                                             <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", cm.score >= 90 ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-700 border border-amber-200")}>
                                               {cm.score.toFixed(0)}%
                                             </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                 )}
                               </div>
                             )}
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-medium capitalize hidden md:table-cell align-top text-xs">
                             {b.category}
                          </td>
                          <td className="px-6 py-4 align-top">
                             <div className="text-slate-900 font-medium text-sm">{b.applicant_name}</div>
                             <div className="text-slate-500 text-xs mt-1">{b.phone_number}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                             <Badge variant={b.status === 'approved' ? 'default' : b.status === 'rejected' ? 'danger' : 'warning'}>
                                {b.status}
                             </Badge>
                          </td>
                          <td className="px-6 py-4 text-center align-top">
                             {b.status === 'pending' ? (
                                <div className="flex flex-col items-center justify-center gap-2">
                                   <button 
                                      onClick={() => handleAnalyzeBooking(b)}
                                      className="text-[11px] bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 px-3 py-1.5 rounded border border-slate-200 transition-colors w-full font-medium shadow-sm flex items-center justify-center gap-1">
                                      <Search className="w-3 h-3" /> Full Analysis
                                   </button>
                                   <div className="flex gap-2 w-full justify-center mt-1">
                                     <button 
                                        onClick={() => updateBookingStatus(b.id, 'approved')}
                                        className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex-1 py-1.5 rounded-md border border-emerald-200 transition-colors font-semibold shadow-sm">
                                        Approve
                                     </button>
                                     <button 
                                        onClick={() => updateBookingStatus(b.id, 'rejected')}
                                        className="text-xs bg-red-50 text-red-700 hover:bg-red-100 flex-1 py-1.5 rounded-md border border-red-200 transition-colors font-semibold shadow-sm">
                                        Reject
                                     </button>
                                   </div>
                                </div>
                             ) : (
                                <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md border border-slate-200 shadow-sm">Processed</span>
                             )}
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
        {activeTab === 'Users' && (
          <div className="space-y-6 flex flex-col flex-1 min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">User Management</h3>
                  <p className="text-sm text-slate-500">Create system users, assign custom roles, and administer system access.</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={fetchRoles}>Refresh Roles</Button>
                <Button size="sm" onClick={fetchUsers} disabled={isLoadingUsers}>
                  {isLoadingUsers ? 'Loading...' : 'Refresh Users'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Adder Pane */}
              <Card className="p-6 h-fit lg:col-span-1 border border-slate-200 shadow-xs bg-white">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-4 h-4 text-violet-600" />
                  <h4 className="text-sm font-semibold text-slate-900">Add New System User</h4>
                </div>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get('userEmail') as string;
                  const selectedRole = formData.get('userRole') as string;
                  if (email && selectedRole) {
                    addUser(email, selectedRole);
                    e.currentTarget.reset();
                  }
                }}>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <input 
                      name="userEmail"
                      type="email"
                      placeholder="user@example.com" 
                      className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 shadow-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Default Assigned Role</label>
                    <select 
                      name="userRole"
                      className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 shadow-xs bg-white"
                      required
                    >
                      {roles.length > 0 ? (
                        roles.map(r => <option key={r.id || r.name} value={r.name}>{r.name}</option>)
                      ) : (
                        <>
                          <option value="viewer">viewer</option>
                          <option value="editor">editor</option>
                          <option value="admin">admin</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200/50 rounded-md p-3 text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-amber-800">Note on Security:</p>
                    <p>New users are created with a default temporary password:</p>
                    <code className="bg-white/80 border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px] select-all block mt-1 text-center font-bold">ecgbcTempPassword123!</code>
                    <p className="mt-1">They are recommended to update this password upon initial sign-in.</p>
                  </div>
                  <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-xs font-semibold text-xs py-2" type="submit">
                    Create System User
                  </Button>
                </form>
              </Card>

              {/* Users Directory Table */}
              <Card className="lg:col-span-2 overflow-hidden flex flex-col border border-slate-200 shadow-xs bg-white font-sans">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">System User Directory</span>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">{systemUsers.length} total users</span>
                </div>
                <div className="overflow-auto max-h-[500px]">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 bg-slate-50 border-b border-slate-200 uppercase">
                      <tr>
                        <th className="px-6 py-4 font-semibold">User Email</th>
                        <th className="px-6 py-4 font-semibold">Assigned Role</th>
                        <th className="px-6 py-4 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingUsers ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm">Loading users...</td>
                        </tr>
                      ) : systemUsers.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm">No users found.</td>
                        </tr>
                      ) : (
                        systemUsers.map((user) => (
                          <tr key={user.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-950">{user.email}</span>
                                <span className="text-[10px] text-slate-400 font-normal">Created {new Date(user.created_at).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-800">
                              <select 
                                className="text-xs font-bold border border-slate-200 rounded-md px-2 py-1 outline-none bg-white focus:ring-1 focus:ring-violet-400 text-slate-800"
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                              >
                                {roles.length > 0 ? (
                                  roles.map(r => <option key={r.id || r.name} value={r.name}>{r.name}</option>)
                                ) : (
                                  <>
                                    <option value="viewer">viewer</option>
                                    <option value="editor">editor</option>
                                    <option value="admin">admin</option>
                                  </>
                                )}
                              </select>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                <button 
                                  onClick={() => deleteUser(user.id, user.email)}
                                  className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                  title="Delete user access"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'Roles' && (
          <div className="space-y-6 flex flex-col flex-1 min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Custom Role Registry</h3>
                  <p className="text-sm text-slate-500">Define and manage custom application roles and permissions.</p>
                </div>
              </div>
              <Button size="sm" onClick={fetchRoles} disabled={isLoadingRoles}>
                {isLoadingRoles ? 'Refreshing...' : 'Refresh Roles'}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 h-fit lg:col-span-1">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Create New Role</h4>
                    <form className="space-y-4" onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const name = formData.get('roleName') as string;
                        const description = formData.get('roleDesc') as string;
                        if (name) {
                            saveRole({ name, description });
                            e.currentTarget.reset();
                        }
                    }}>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role Name</label>
                            <input 
                                name="roleName"
                                placeholder="e.g. Moderator" 
                                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-sm"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                            <textarea 
                                name="roleDesc"
                                placeholder="What can this role do?" 
                                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-sm min-h-[80px]"
                            />
                        </div>
                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm" type="submit">Create Role</Button>
                    </form>
                </Card>

                <Card className="lg:col-span-2 overflow-hidden flex flex-col">
                    <div className="overflow-auto border-t border-slate-100">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Role Name</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoadingRoles ? (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Loading roles...</td></tr>
                                ) : roles.length === 0 ? (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No custom roles found. Defaulting to system roles.</td></tr>
                                ) : (
                                    roles.map(r => (
                                        <tr key={r.id || r.name} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-bold text-slate-900 italic">
                                                {r.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={r.description}>
                                                {r.description || 'No description provided.'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button 
                                                        disabled={['admin', 'viewer', 'editor'].includes(r.name.toLowerCase())}
                                                        onClick={() => deleteRole(r.id)}
                                                        className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed p-1 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
          </div>
        )}
        
        {/* Booking Analysis Modal */}
        {showBookingAnalysisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 fade-in duration-200">
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setShowBookingAnalysisModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">Registration Name Analysis</h3>
              
              {analyzingBookingId ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                   <p className="text-sm text-slate-500 font-medium tracking-wide">Analyzing against master registry...</p>
                </div>
              ) : bookingAnalysisResult ? (
                <div className="space-y-6 mt-6">
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-start gap-4">
                       <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1 leading-none uppercase tracking-wider">Requested Setup</p>
                          <p className="text-lg font-bold text-slate-900 mt-2">{bookingAnalysisResult.booking.church_name_am || bookingAnalysisResult.booking.church_name_en}</p>
                          {bookingAnalysisResult.booking.church_name_en && bookingAnalysisResult.booking.church_name_am && (
                             <p className="text-sm text-slate-600 font-medium">{bookingAnalysisResult.booking.church_name_en}</p>
                          )}
                       </div>
                       <div className="text-right whitespace-nowrap">
                          <p className="text-xs font-semibold text-slate-500 mb-1 leading-none uppercase tracking-wider">Applicant</p>
                          <p className="text-sm font-bold text-slate-900 mt-2 flex items-center justify-end gap-1.5"><UserIcon className="w-3.5 h-3.5 text-slate-400" /> {bookingAnalysisResult.booking.applicant_name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-1 flex items-center justify-end gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {bookingAnalysisResult.booking.phone_number}</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/70">
                       <div className="flex gap-2">
                         <Badge variant="default" className="text-[10px] uppercase tracking-wider">{bookingAnalysisResult.booking.category}</Badge>
                         <Badge variant="default" className="text-[10px] text-slate-600 bg-white border-slate-200 shadow-sm">{new Date(bookingAnalysisResult.booking.created_at).toLocaleDateString()}</Badge>
                       </div>
                       <div className="text-[10px] font-mono text-slate-400">
                          ID: {bookingAnalysisResult.booking.id.split('-')[0]}
                       </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                       <Database className="w-4 h-4 text-indigo-500"/>
                       Registry Conflict Analysis
                    </h4>
                    
                    {bookingAnalysisResult.result.matchType === 'Unique' ? (
                       <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-start gap-4">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-0.5 shrink-0" />
                          <div>
                            <h5 className="font-bold text-emerald-900">Name is likely unique</h5>
                            <p className="text-sm text-emerald-700 mt-1">Highest similarity found is {bookingAnalysisResult.result.similarity.toFixed(0)}%, which is below the conflict threshold.</p>
                          </div>
                       </div>
                    ) : (
                       <div className="space-y-4">
                         <div className={cn("border p-4 rounded-lg flex items-start gap-4", bookingAnalysisResult.result.matchType === 'Likey Duplicate' ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200")}>
                            <AlertTriangle className={cn("w-6 h-6 mt-0.5 shrink-0", bookingAnalysisResult.result.matchType === 'Likey Duplicate' ? "text-red-500" : "text-amber-500")} />
                            <div>
                               <h5 className={cn("font-bold", bookingAnalysisResult.result.matchType === 'Likey Duplicate' ? "text-red-900" : "text-amber-900")}>
                                  {bookingAnalysisResult.result.matchType === 'Likey Duplicate' ? 'High Risk of Duplication' : 'Similar Names Found'}
                               </h5>
                               <p className={cn("text-sm mt-1", bookingAnalysisResult.result.matchType === 'Likey Duplicate' ? "text-red-700" : "text-amber-700")}>
                                  The highest match score is {bookingAnalysisResult.result.similarity.toFixed(0)}%. Please review candidates carefully before approving.
                               </p>
                            </div>
                         </div>
                         
                         <div className="space-y-3">
                           <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Closest Matches in Registry</p>
                           {bookingAnalysisResult.result.closeMatches?.slice(0, 5).map((cm: any, idx: number) => (
                              <div key={idx} className={cn("flex flex-col p-4 border rounded-xl bg-white shadow-sm gap-3", cm.score >= 90 ? "border-red-200" : cm.score >= 80 ? "border-amber-200" : "border-slate-200")}>
                                <div className="flex justify-between items-start gap-4">
                                  <div className="max-w-[70%]">
                                    <p className="font-bold text-slate-900 leading-tight">{cm.matchAm}</p>
                                    {cm.matchEn && <p className="text-sm font-medium text-slate-600 mt-1">{cm.matchEn}</p>}
                                    
                                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                                       <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">ID: {cm.registrationId || 'Unknown'}</span>
                                       {cm.region && (
                                          <span className="text-xs text-slate-500 flex items-center gap-1">
                                             <MapPin className="w-3 h-3"/> {cm.region}
                                          </span>
                                       )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                     <div className={cn("font-bold text-xl px-2 py-1 rounded-md", cm.score >= 90 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
                                       {cm.score.toFixed(0)}%
                                     </div>
                                  </div>
                                </div>
                                {cm.ruleFlags && cm.ruleFlags.length > 0 && (
                                   <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50">
                                     <span className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5 mr-1">Flags matched:</span>
                                     {cm.ruleFlags.map((flag: string, i: number) => (
                                        <Badge key={i} variant="default" className={cn("text-[10px] font-medium border shadow-xs", flag.includes('(+') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : flag.includes('(-') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-700 border-slate-200')}>{flag}</Badge>
                                     ))}
                                   </div>
                                )}
                              </div>
                           ))}
                         </div>
                       </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <Button variant="outline" className="flex-1" onClick={() => setShowBookingAnalysisModal(false)}>Close</Button>
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" 
                      onClick={() => {
                        setShowBookingAnalysisModal(false);
                        updateBookingStatus(bookingAnalysisResult.booking.id, 'approved');
                      }}
                    >
                      Approve Name
                    </Button>
                    <Button 
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => {
                        setShowBookingAnalysisModal(false);
                        updateBookingStatus(bookingAnalysisResult.booking.id, 'rejected');
                      }}
                    >
                      Reject Name
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  Failed to analyze. Master registry might be empty.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
