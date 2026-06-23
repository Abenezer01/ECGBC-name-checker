// Global UI definitions

export type ReportRow = {
  id: string; // Unique row id
  submittedName: string;
  closestMatchAm: string;
  closestMatchEn: string;
  similarity: number; // 0-100
  matchType: 'Likey Duplicate' | 'Needs Manual Review' | 'Unique';
  registrationId: string;
  region?: string;
  action: 'Pending' | 'Approved' | 'Duplicate' | 'Escalate' | 'Ignore';
  applicantName: string;
  submittedAt: string;
  closeMatches?: {
    matchAm: string;
    matchEn: string;
    registrationId: string;
    score: number;
    ruleFlags?: string[];
  }[];
};

export type DatabaseStats = {
  totalChecked: number;
  likelyDuplicates: number;
  manualReviews: number;
  uniqueNames: number;
  progress: number; // 0-100
};

export type MasterRecord = {
  id?: string;
  church_name: string;
  certificate_no?: string;
  certificate_issued_date?: string;
  country?: string;
  type?: string;
  created_at?: string;
};
