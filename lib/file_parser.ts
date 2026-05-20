import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Normalizes file keys making them lowercase and underscored
 */
function normalizeKeys(row: Record<string, any>) {
  const normalized: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
     const nKey = key.trim().toLowerCase().replace(/\\s+/g, '_');
     normalized[nKey] = val;
  }
  return normalized;
}

export async function parseFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const name = file.name.toLowerCase();
    
    if (name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const raw = results.data as any[];
          resolve(raw.map(normalizeKeys));
        },
        error: (err) => reject(err)
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          let allData: any[] = [];
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            if (jsonData.length > 0) {
              allData = allData.concat(jsonData.map(row => normalizeKeys(row as any)));
            }
          }
          resolve(allData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
}

// Export files
export function downloadCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Conflicts");
  XLSX.writeFile(wb, filename);
}
