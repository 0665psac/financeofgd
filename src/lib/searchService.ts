import { fetchAllSheetsData, isNovember68OrNewer, SheetData } from "./googleSheets";

export interface MonthDetail {
  monthName: string;
  pricePerWeek: number;
  unpaidWeeks: number[];
  totalAmount: number;
}

export interface SearchResult {
  found: boolean;
  studentName?: string;
  totalAmount?: number;
  paidAmount?: number;
  monthDetails?: MonthDetail[];
}

// Cache for sheet data
let cachedData: SheetData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getSheetData(): Promise<SheetData[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedData;
  }
  
  // Fetch fresh data
  cachedData = await fetchAllSheetsData();
  cacheTimestamp = now;
  
  return cachedData;
}

export async function searchStudent(studentId: string): Promise<SearchResult> {
  const trimmedId = studentId.trim().replace(/\D/g, ""); // Remove non-digits
  
  if (!trimmedId) {
    return { found: false };
  }
  
  try {
    const allSheets = await getSheetData();
    
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

        // Determine price per week based on sheet date
        const pricePerWeek = isNovember68OrNewer(sheet.sheetName) ? 40 : 20;

        // Find unpaid and paid weeks
        const unpaidWeeks: number[] = [];
        let paidWeeksCount = 0;
        
        if (!record.week1) unpaidWeeks.push(1); else paidWeeksCount++;
        if (!record.week2) unpaidWeeks.push(2); else paidWeeksCount++;
        if (!record.week3) unpaidWeeks.push(3); else paidWeeksCount++;
        if (!record.week4) unpaidWeeks.push(4); else paidWeeksCount++;

        // Add to paid amount
        paidAmount += paidWeeksCount * pricePerWeek;

        if (unpaidWeeks.length > 0) {
          const monthTotal = unpaidWeeks.length * pricePerWeek;
          totalAmount += monthTotal;

          monthDetails.push({
            monthName: sheet.sheetName,
            pricePerWeek,
            unpaidWeeks,
            totalAmount: monthTotal,
          });
        }
      }
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
  cacheTimestamp = 0;
}
