// Mock data for testing - will be replaced with Google Sheets API
export interface StudentRecord {
  studentId: string;
  studentName: string;
  weeks: {
    week1: boolean;
    week2: boolean;
    week3: boolean;
    week4: boolean;
  };
}

export interface SheetData {
  sheetName: string;
  records: StudentRecord[];
}

// Mock data simulating Google Sheets structure
export const mockSheetData: SheetData[] = [
  {
    sheetName: "ธันวาคม (68)",
    records: [
      {
        studentId: "6501234567",
        studentName: "สมชาย ใจดี",
        weeks: { week1: true, week2: false, week3: false, week4: false },
      },
      {
        studentId: "6501234568",
        studentName: "สมหญิง รักเรียน",
        weeks: { week1: true, week2: true, week3: true, week4: true },
      },
      {
        studentId: "6501234569",
        studentName: "มานะ พยายาม",
        weeks: { week1: false, week2: false, week3: true, week4: false },
      },
    ],
  },
  {
    sheetName: "พฤศจิกายน (68)",
    records: [
      {
        studentId: "6501234567",
        studentName: "สมชาย ใจดี",
        weeks: { week1: true, week2: true, week3: false, week4: true },
      },
      {
        studentId: "6501234568",
        studentName: "สมหญิง รักเรียน",
        weeks: { week1: true, week2: true, week3: true, week4: true },
      },
      {
        studentId: "6501234569",
        studentName: "มานะ พยายาม",
        weeks: { week1: true, week2: false, week3: false, week4: true },
      },
    ],
  },
  {
    sheetName: "ตุลาคม (68)",
    records: [
      {
        studentId: "6501234567",
        studentName: "สมชาย ใจดี",
        weeks: { week1: false, week2: false, week3: true, week4: true },
      },
      {
        studentId: "6501234568",
        studentName: "สมหญิง รักเรียน",
        weeks: { week1: true, week2: true, week3: true, week4: true },
      },
      {
        studentId: "6501234569",
        studentName: "มานะ พยายาม",
        weeks: { week1: false, week2: false, week3: false, week4: false },
      },
    ],
  },
];

// Month order for Thai calendar (newer months have higher index)
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

export function parseSheetName(sheetName: string): { month: string; year: number } | null {
  const match = sheetName.match(/^(.+?)\s*\((\d+)\)$/);
  if (!match) return null;
  return { month: match[1].trim(), year: parseInt(match[2]) };
}

export function isNovember68OrNewer(sheetName: string): boolean {
  const parsed = parseSheetName(sheetName);
  if (!parsed) return false;
  
  const { month, year } = parsed;
  const monthIndex = monthOrder[month] || 0;
  
  // November 68 = year 68, month 11
  if (year > 68) return true;
  if (year < 68) return false;
  return monthIndex >= 11; // November or December of 68
}

export function getMonthSortOrder(sheetName: string): number {
  const parsed = parseSheetName(sheetName);
  if (!parsed) return 0;
  
  const { month, year } = parsed;
  const monthIndex = monthOrder[month] || 0;
  
  // Higher number = more recent
  return year * 100 + monthIndex;
}
