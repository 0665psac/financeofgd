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

// Fetch total amount from "สรุปยอดเงิน" sheet cell B13
export async function fetchTotalAmount(): Promise<number | null> {
  const sheetName = encodeURIComponent("'สรุปยอดเงิน'!B13");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch total amount: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    const value = data.values?.[0]?.[0];
    
    if (!value) return null;
    
    // Parse number (handle comma-separated format)
    const numValue = parseFloat(value.toString().replace(/,/g, ""));
    return isNaN(numValue) ? null : numValue;
  } catch (error) {
    console.error("Error fetching total amount:", error);
    return null;
  }
}
