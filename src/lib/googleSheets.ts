const API_KEY = "AIzaSyDgVQ91OU-BBthsYGKtCYAOg-8EPQKlrkw";
const SPREADSHEET_ID = "1luO33qY0EXsl0xQHX3grA6ayemyHiIjTx4TsNEWjwB4";

// Sheet name pattern: "เดือน (ปี)" e.g., "พฤศจิกายน (68)"
const SHEET_NAME_PATTERN = /^(.+?)\s*\((\d+)\)$/;

// Month order for Thai calendar
const monthOrder: Record<string, number> = {
  "มกราคม": 1,
  "กุมภาพันธ์": 2,
  "มีนาคม": 3,
  "เมษายน": 4,
  "พฤษภาคม": 5,
  "มิถุนายน": 6,
  "กรกฎาคม": 7,
  "สิงหาคม": 8,
  "กันยายน": 9,
  "ตุลาคม": 10,
  "พฤศจิกายน": 11,
  "ธันวาคม": 12,
};

export interface SheetRecord {
  studentName: string;
  studentId: string;
  week1: boolean;
  week2: boolean;
  week3: boolean;
  week4: boolean;
}

export interface SheetData {
  sheetName: string;
  records: SheetRecord[];
}

// Parse sheet name to extract month and year
export function parseSheetName(sheetName: string): { month: string; year: number } | null {
  const match = sheetName.match(SHEET_NAME_PATTERN);
  if (!match) return null;
  return { month: match[1].trim(), year: parseInt(match[2]) };
}

// Check if sheet is November 68 or newer (40 baht rate)
export function isNovember68OrNewer(sheetName: string): boolean {
  const parsed = parseSheetName(sheetName);
  if (!parsed) return false;
  
  const { month, year } = parsed;
  const monthIndex = monthOrder[month] || 0;
  
  if (year > 68) return true;
  if (year < 68) return false;
  return monthIndex >= 11;
}

// Get sort order for sheets (higher = more recent)
export function getMonthSortOrder(sheetName: string): number {
  const parsed = parseSheetName(sheetName);
  if (!parsed) return 0;
  
  const { month, year } = parsed;
  const monthIndex = monthOrder[month] || 0;
  
  return year * 100 + monthIndex;
}

// Fetch all sheet names from the spreadsheet
async function fetchSheetNames(): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}&fields=sheets.properties.title`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet names: ${response.statusText}`);
  }
  
  const data = await response.json();
  const sheetNames: string[] = data.sheets
    .map((sheet: { properties: { title: string } }) => sheet.properties.title)
    .filter((name: string) => SHEET_NAME_PATTERN.test(name));
  
  return sheetNames;
}

// Fetch data from a specific sheet
async function fetchSheetData(sheetName: string): Promise<SheetRecord[]> {
  // Fetch columns B, C, D, E, F, G
  const range = encodeURIComponent(`'${sheetName}'!B:G`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
  }
  
  const data = await response.json();
  const rows: string[][] = data.values || [];
  
  // Skip header row and filter invalid rows
  const records: SheetRecord[] = [];
  const skipKeywords = ["ลาออก", "กราฟิก", "รหัสนิสิต", "รหัส"];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;
    
    const studentName = (row[0] || "").trim();
    const studentIdRaw = (row[1] || "").trim();
    
    // Skip if student ID is empty or contains skip keywords
    if (!studentIdRaw) continue;
    if (skipKeywords.some(keyword => studentIdRaw.includes(keyword))) continue;
    
    // Convert student ID to number format (remove any non-digit characters)
    const studentId = studentIdRaw.replace(/\D/g, "");
    if (!studentId || studentId.length < 5) continue;
    
    // Parse week values (TRUE = paid, anything else = unpaid)
    const parseWeekValue = (value: string | undefined): boolean => {
      if (!value) return false;
      const trimmed = value.trim().toUpperCase();
      return trimmed === "TRUE" || trimmed === "✓" || trimmed === "✔";
    };
    
    records.push({
      studentName,
      studentId,
      week1: parseWeekValue(row[2]),
      week2: parseWeekValue(row[3]),
      week3: parseWeekValue(row[4]),
      week4: parseWeekValue(row[5]),
    });
  }
  
  return records;
}

// Fetch all data from all valid sheets
export async function fetchAllSheetsData(): Promise<SheetData[]> {
  const sheetNames = await fetchSheetNames();
  
  const allData: SheetData[] = [];
  
  for (const sheetName of sheetNames) {
    try {
      const records = await fetchSheetData(sheetName);
      if (records.length > 0) {
        allData.push({ sheetName, records });
      }
    } catch (error) {
      console.error(`Error fetching sheet "${sheetName}":`, error);
    }
  }
  
  // Sort by date (newest first)
  allData.sort((a, b) => getMonthSortOrder(b.sheetName) - getMonthSortOrder(a.sheetName));
  
  return allData;
}

// Fetch total amount from "สรุปยอดเงิน" sheet - find "เงินคงเหลือ" in column A and get value from column B
export async function fetchTotalAmount(): Promise<number | null> {
  const range = encodeURIComponent("'สรุปยอดเงิน'!A:B");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch total amount: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    const rows: string[][] = data.values || [];
    
    // Find row where column A contains "เงินคงเหลือ"
    for (const row of rows) {
      const colA = (row[0] || "").trim();
      if (colA.includes("เงินคงเหลือ")) {
        const value = row[1];
        if (!value) return null;
        
        // Parse number (handle comma-separated format)
        const numValue = parseFloat(value.toString().replace(/,/g, ""));
        return isNaN(numValue) ? null : numValue;
      }
    }
    
    console.error("Could not find 'เงินคงเหลือ' in column A");
    return null;
  } catch (error) {
    console.error("Error fetching total amount:", error);
    return null;
  }
}

// Interface for student status in a month
export interface MonthlyStudentStatus {
  studentId: string;
  studentName: string;
  major: string;
  week1: boolean;
  week2: boolean;
  week3: boolean;
  week4: boolean;
  weeksPaid: number;
}

// Interface for dashboard summary data
export interface DashboardSummary {
  balance: number | null;           // เงินคงเหลือ
  totalCollected: number | null;    // เงินที่เก็บมาแล้ว (รวม)
  totalOutstanding: number | null;  // ขาดอีก (รวม)
  totalExpected: number | null;     // เงินที่จะเก็บ (รวม)
  totalExpenses: number | null;     // รายจ่ายรวม
  studentCount: number | null;      // จำนวนนิสิตในสาขา
  monthlyData: Array<{
    month: string;
    collected: number;
    outstanding: number;
    expected: number;
  }>;
}

// Fetch students data for a specific month sheet
export async function fetchMonthlyStudents(sheetName: string): Promise<MonthlyStudentStatus[]> {
  const range = encodeURIComponent(`'${sheetName}'!A:H`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
  
  const students: MonthlyStudentStatus[] = [];
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch monthly students: ${response.statusText}`);
      return students;
    }
    
    const data = await response.json();
    const rows: string[][] = data.values || [];
    
    let currentMajor = "";
    const skipKeywords = ["ลำดับที่", "รหัสนิสิต", "จ่ายแล้ว", "จาก", "คน"];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;
      
      const colA = (row[0] || "").trim();
      const colB = (row[1] || "").trim();
      const colC = (row[2] || "").trim();
      
      // Check if this is a major header row (column B has major name, column A is empty or has header)
      if (colB && !colC && colB.length > 0 && !skipKeywords.some(k => colB.includes(k))) {
        // This might be a major header - check if it looks like a name
        const isMajorHeader = colB === "ผลิตภัณฑ์" || colB === "กราฟิก" || colB.includes("ผลิต") || colB.includes("กราฟ");
        if (isMajorHeader) {
          currentMajor = colB;
          continue;
        }
      }
      
      // Also check column A for major headers
      if (colA && !colB && !colC) {
        const isMajorHeader = colA === "ผลิตภัณฑ์" || colA === "กราฟิก" || colA.includes("ผลิต") || colA.includes("กราฟ");
        if (isMajorHeader) {
          currentMajor = colA;
          continue;
        }
      }
      
      // Skip header rows or invalid rows
      if (skipKeywords.some(k => colB.toLowerCase().includes(k.toLowerCase()))) continue;
      if (skipKeywords.some(k => colA.toLowerCase().includes(k.toLowerCase()))) continue;
      
      // Parse student row: A=ลำดับ, B=ชื่อ, C=รหัสนิสิต, D=Week1, E=Week2, F=Week3, G=Week4
      const studentName = colB;
      const studentIdRaw = colC;
      
      if (!studentIdRaw || !studentName) continue;
      
      // Convert student ID to number format
      const studentId = studentIdRaw.replace(/\D/g, "");
      if (!studentId || studentId.length < 5) continue;
      
      // Parse week values
      const parseWeekValue = (value: string | undefined): boolean => {
        if (!value) return false;
        const trimmed = value.trim().toUpperCase();
        return trimmed === "TRUE" || trimmed === "✓" || trimmed === "✔";
      };
      
      const week1 = parseWeekValue(row[3]);
      const week2 = parseWeekValue(row[4]);
      const week3 = parseWeekValue(row[5]);
      const week4 = parseWeekValue(row[6]);
      
      const weeksPaid = [week1, week2, week3, week4].filter(Boolean).length;
      
      students.push({
        studentId,
        studentName,
        major: currentMajor || "ไม่ระบุสาขา",
        week1,
        week2,
        week3,
        week4,
        weeksPaid,
      });
    }
    
    return students;
  } catch (error) {
    console.error("Error fetching monthly students:", error);
    return students;
  }
}

// Fetch dashboard summary data from "สรุปยอดเงิน" sheet
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const range = encodeURIComponent("'สรุปยอดเงิน'!A:O");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
  
  const summary: DashboardSummary = {
    balance: null,
    totalCollected: null,
    totalOutstanding: null,
    totalExpected: null,
    totalExpenses: null,
    studentCount: null,
    monthlyData: [],
  };
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch dashboard summary: ${response.statusText}`);
      return summary;
    }
    
    const data = await response.json();
    const rows: string[][] = data.values || [];
    
    const parseNumber = (value: string | undefined): number | null => {
      if (!value) return null;
      const numValue = parseFloat(value.toString().replace(/,/g, ""));
      return isNaN(numValue) ? null : numValue;
    };
    
    for (const row of rows) {
      const colA = (row[0] || "").trim();
      
      // Find "เงินคงเหลือ" row
      if (colA.includes("เงินคงเหลือ")) {
        summary.balance = parseNumber(row[1]);
      }
      
      // Find "รวม" row for totals (in income section)
      if (colA === "รวม") {
        summary.totalCollected = parseNumber(row[1]);
        summary.totalOutstanding = parseNumber(row[2]);
        summary.totalExpected = parseNumber(row[3]);
      }
      
      // Parse monthly data (rows with months like "สิงหาคม (68)")
      if (SHEET_NAME_PATTERN.test(colA) || colA === "ค่าพาน") {
        const collected = parseNumber(row[1]);
        const outstanding = parseNumber(row[2]);
        const expected = parseNumber(row[3]);
        
        if (collected !== null || outstanding !== null || expected !== null) {
          summary.monthlyData.push({
            month: colA,
            collected: collected ?? 0,
            outstanding: outstanding ?? 0,
            expected: expected ?? 0,
          });
        }
      }
    }
    
    // Look for expenses total (column F-G, "รวม" in expenses section)
    for (const row of rows) {
      const colF = (row[5] || "").trim();
      if (colF === "รวม") {
        summary.totalExpenses = parseNumber(row[6]);
        break;
      }
    }
    
    // Look for student count (column N-O, "จำนวนนิสิตในสาขา")
    for (const row of rows) {
      const colN = (row[13] || "").trim();
      if (colN.includes("จำนวนนิสิตในสาขา")) {
        summary.studentCount = parseNumber(row[14]);
        break;
      }
    }
    
    return summary;
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return summary;
  }
}
