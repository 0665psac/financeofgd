import { fetchAllSheetsData, fetchAllFeeSheetsData, getPricePerWeek, SheetData, FeeSheetData } from "./googleSheets";

export interface MonthDetail {
  monthName: string;
  pricePerWeek: number;
  unpaidWeeks: number[];
  paidWeeks: number[];
  totalAmount: number;
  isFullyPaid: boolean;
  // Fee-sheet extension (e.g., ค่าเสื้อช็อป, ค่าพานไหว้ครู)
  isFeeSheet?: boolean;
  feeRequired?: number;
  feePaid?: number;
}

export interface SearchResult {
  found: boolean;
  studentName?: string;
  totalAmount?: number;
  paidAmount?: number;
  monthDetails?: MonthDetail[];
  major?: string;
}

// Cache for sheet data
let cachedData: SheetData[] | null = null;
let cachedFeeData: FeeSheetData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getAllData(): Promise<{ months: SheetData[]; fees: FeeSheetData[] }> {
  const now = Date.now();

  if (cachedData && cachedFeeData && (now - cacheTimestamp) < CACHE_DURATION) {
    return { months: cachedData, fees: cachedFeeData };
  }

  const [months, fees] = await Promise.all([
    fetchAllSheetsData(),
    fetchAllFeeSheetsData(),
  ]);
  cachedData = months;
  cachedFeeData = fees;
  cacheTimestamp = now;

  return { months, fees };
}

// Determine major based on student ID
// Based on spreadsheet pattern: ผลิตภัณฑ์ students have IDs 6810610059-6810610243
// กราฟิก students have IDs 6810610001-6810610xxx (lower numbers)
function determineMajor(studentId: string): string {
  // Extract last digits after 68106100 prefix
  if (studentId.startsWith("68106100")) {
    const suffix = parseInt(studentId.slice(8), 10);
    // ผลิตภัณฑ์ range: 59+ (based on spreadsheet showing 59-71, 234, 243)
    if (suffix >= 59) {
      return "ผลิตภัณฑ์";
    }
  }
  // Default to กราฟิก for lower numbers or 681067xx prefix
  return "กราฟิก";
}

export async function searchStudent(studentId: string): Promise<SearchResult> {
  const trimmedId = studentId.trim().replace(/\D/g, ""); // Remove non-digits
  
  if (!trimmedId) {
    return { found: false };
  }
  
  try {
    const { months: allSheets, fees: allFees } = await getAllData();
    
    let studentName: string | undefined;
    const monthDetails: MonthDetail[] = [];
    let totalAmount = 0;
    let paidAmount = 0;
    let foundInAnySheet = false;

    for (const sheet of allSheets) {
      const record = sheet.records.find(
        (r) => r.studentId === trimmedId
      );

      if (record) {
        foundInAnySheet = true;
        if (!studentName) {
          studentName = record.studentName;
        }

        const pricePerWeek = getPricePerWeek(sheet.sheetName);

        const unpaidWeeks: number[] = [];
        let paidWeeksCount = 0;
        
        if (!record.week1) unpaidWeeks.push(1); else paidWeeksCount++;
        if (!record.week2) unpaidWeeks.push(2); else paidWeeksCount++;
        if (!record.week3) unpaidWeeks.push(3); else paidWeeksCount++;
        if (!record.week4) unpaidWeeks.push(4); else paidWeeksCount++;

        paidAmount += paidWeeksCount * pricePerWeek;

        const monthTotal = unpaidWeeks.length * pricePerWeek;
        totalAmount += monthTotal;

        monthDetails.push({
          monthName: sheet.sheetName,
          pricePerWeek,
          unpaidWeeks,
          paidWeeks: [1, 2, 3, 4].filter(w => !unpaidWeeks.includes(w)),
          totalAmount: monthTotal,
          isFullyPaid: unpaidWeeks.length === 0,
        });
      }
    }

    // Fee sheets (e.g., ค่าเสื้อช็อป, ค่าพานไหว้ครู)
    for (const fee of allFees) {
      const record = fee.records.find((r) => r.studentId === trimmedId);
      if (!record) continue;

      foundInAnySheet = true;
      if (!studentName) studentName = record.studentName;

      const required = fee.requiredAmount;
      const paid = record.isFullyPaid ? required : record.paidAmount;
      const outstanding = record.isFullyPaid ? 0 : Math.max(0, required - record.paidAmount);

      paidAmount += paid;
      totalAmount += outstanding;

      monthDetails.push({
        monthName: fee.sheetName,
        pricePerWeek: 0,
        unpaidWeeks: [],
        paidWeeks: [],
        totalAmount: outstanding,
        isFullyPaid: outstanding === 0,
        isFeeSheet: true,
        feeRequired: required,
        feePaid: paid,
      });
    }

    if (!foundInAnySheet) {
      return { found: false };
    }


    return {
      found: true,
      studentName,
      totalAmount,
      paidAmount,
      monthDetails,
      major: determineMajor(trimmedId),
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error searching student:", error);
    }
    throw error;
  }
}

// Force refresh cache
export function clearCache(): void {
  cachedData = null;
  cachedFeeData = null;
  cacheTimestamp = 0;
}
