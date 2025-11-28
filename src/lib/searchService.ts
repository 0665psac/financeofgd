import { mockSheetData, isNovember68OrNewer, getMonthSortOrder } from "./mockData";

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
  monthDetails?: MonthDetail[];
}

export function searchStudent(studentId: string): SearchResult {
  const trimmedId = studentId.trim();
  
  let studentName: string | undefined;
  const monthDetails: MonthDetail[] = [];
  let totalAmount = 0;
  let foundInAnySheet = false;

  // Sort sheets by date (newest first)
  const sortedSheets = [...mockSheetData].sort(
    (a, b) => getMonthSortOrder(b.sheetName) - getMonthSortOrder(a.sheetName)
  );

  for (const sheet of sortedSheets) {
    const record = sheet.records.find(
      (r) => r.studentId.toString() === trimmedId
    );

    if (record) {
      foundInAnySheet = true;
      if (!studentName) {
        studentName = record.studentName;
      }

      // Determine price per week based on sheet date
      const pricePerWeek = isNovember68OrNewer(sheet.sheetName) ? 40 : 20;

      // Find unpaid weeks
      const unpaidWeeks: number[] = [];
      if (!record.weeks.week1) unpaidWeeks.push(1);
      if (!record.weeks.week2) unpaidWeeks.push(2);
      if (!record.weeks.week3) unpaidWeeks.push(3);
      if (!record.weeks.week4) unpaidWeeks.push(4);

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
    monthDetails,
  };
}
