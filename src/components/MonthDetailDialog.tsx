import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Loader2 } from "lucide-react";

export interface StudentStatus {
  studentId: string;
  studentName: string;
  major: string;
  week1: boolean;
  week2: boolean;
  week3: boolean;
  week4: boolean;
  weeksPaid: number;
}

interface MonthDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  students: StudentStatus[];
  isLoading: boolean;
}

const MonthDetailDialog = ({ open, onOpenChange, month, students, isLoading }: MonthDetailDialogProps) => {
  // Filter only students with outstanding payments (not paid all 4 weeks)
  const outstandingStudents = students.filter((s) => s.weeksPaid < 4);
  
  // Sort by weeks NOT paid (most outstanding first), then by student ID
  const sortedStudents = [...outstandingStudents].sort((a, b) => {
    const aOutstanding = 4 - a.weeksPaid;
    const bOutstanding = 4 - b.weeksPaid;
    if (bOutstanding !== aOutstanding) {
      return bOutstanding - aOutstanding; // Most outstanding first
    }
    return a.studentId.localeCompare(b.studentId);
  });

  // Group sorted students by major
  const groupedByMajor = sortedStudents.reduce((acc, student) => {
    if (!acc[student.major]) {
      acc[student.major] = [];
    }
    acc[student.major].push(student);
    return acc;
  }, {} as Record<string, StudentStatus[]>);

  // Sort majors alphabetically
  const sortedMajors = Object.keys(groupedByMajor).sort();

  const WeekBadge = ({ paid, week }: { paid: boolean; week: number }) => (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
        paid
          ? "bg-emerald-500/20 text-emerald-500"
          : "bg-red-500/20 text-red-500"
      }`}
    >
      {paid ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold">
            ยอดค้าง {month}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            เรียงจากยอดค้างมากที่สุด
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sortedStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">ไม่มีนิสิตค้างชำระ 🎉</p>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-8 text-center">ค้าง</span>
                <span className="w-24">รหัสนิสิต</span>
                <span className="flex-1">ชื่อ</span>
                <div className="flex gap-1">
                  <span className="w-8 text-center">W1</span>
                  <span className="w-8 text-center">W2</span>
                  <span className="w-8 text-center">W3</span>
                  <span className="w-8 text-center">W4</span>
                </div>
              </div>

              {sortedMajors.map((major) => (
                <div key={major} className="space-y-2">
                  {/* Major Header */}
                  <div className="flex items-center justify-between bg-primary/10 rounded-xl px-4 py-2">
                    <span className="font-bold text-primary">{major}</span>
                    <span className="text-xs text-muted-foreground">
                      ค้าง {groupedByMajor[major].length} คน
                    </span>
                  </div>

                  {/* Students in this major */}
                  <div className="space-y-1">
                    {groupedByMajor[major].map((student) => (
                      <div
                        key={student.studentId}
                        className="flex items-center gap-2 p-2 bg-background/50 rounded-xl hover:bg-background/80 transition-colors"
                      >
                        <span className="w-8 text-center text-sm font-bold text-red-500">
                          {4 - student.weeksPaid}
                        </span>
                        <span className="w-24 text-xs font-mono text-muted-foreground">
                          {student.studentId}
                        </span>
                        <span className="flex-1 text-sm font-medium truncate">
                          {student.studentName}
                        </span>
                        <div className="flex gap-1">
                          <WeekBadge paid={student.week1} week={1} />
                          <WeekBadge paid={student.week2} week={2} />
                          <WeekBadge paid={student.week3} week={3} />
                          <WeekBadge paid={student.week4} week={4} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="mt-4 p-4 bg-muted/50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">นิสิตทั้งหมด</span>
                  <span className="font-bold">{students.length} คน</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">จ่ายครบแล้ว</span>
                  <span className="font-bold text-emerald-500">
                    {students.filter((s) => s.weeksPaid === 4).length} คน
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">ยังค้างอยู่</span>
                  <span className="font-bold text-red-500">
                    {sortedStudents.length} คน
                  </span>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MonthDetailDialog;
