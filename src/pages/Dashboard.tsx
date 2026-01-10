import { useState, useEffect } from "react";
import { ArrowLeft, Users, TrendingUp, DollarSign, Wallet, Receipt, RefreshCw, Target, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { fetchDashboardSummary, fetchAllSheetsData, DashboardSummary, SheetData, isNovember68OrNewer } from "@/lib/googleSheets";

interface StudentPaymentStatus {
  studentId: string;
  studentName: string;
  totalWeeksUnpaid: number;
  totalAmount: number;
  isPaidAll: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  
  // Outstanding students state
  const [allStudents, setAllStudents] = useState<StudentPaymentStatus[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [summaryData, sheetsData] = await Promise.all([
        fetchDashboardSummary(),
        fetchAllSheetsData()
      ]);
      setSummary(summaryData);
      
      // Calculate total outstanding per student across all months
      const studentMap = new Map<string, StudentPaymentStatus>();
      
      for (const sheet of sheetsData) {
        const weeklyRate = isNovember68OrNewer(sheet.sheetName) ? 40 : 30;
        
        for (const record of sheet.records) {
          const weeksUnpaid = [record.week1, record.week2, record.week3, record.week4].filter(w => !w).length;
          
          const existing = studentMap.get(record.studentId);
          if (existing) {
            existing.totalWeeksUnpaid += weeksUnpaid;
            existing.totalAmount += weeksUnpaid * weeklyRate;
            if (weeksUnpaid > 0) existing.isPaidAll = false;
          } else {
            studentMap.set(record.studentId, {
              studentId: record.studentId,
              studentName: record.studentName,
              totalWeeksUnpaid: weeksUnpaid,
              totalAmount: weeksUnpaid * weeklyRate,
              isPaidAll: weeksUnpaid === 0,
            });
          }
        }
      }
      
      // Sort by total amount descending (outstanding first, then paid)
      const sortedStudents = Array.from(studentMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount);
      
      setAllStudents(sortedStudents);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    return num.toLocaleString("th-TH");
  };

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden">
      <div className="relative z-10 container max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">ข้อมูลสรุปภาพรวม</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            disabled={isLoading}
            className="rounded-full"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </header>

        {/* Main Balance Card */}
        <div className="mb-6 p-6 glass-card rounded-3xl">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full gradient-success flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">เงินคงเหลือ</span>
          </div>
          <div className="text-center">
            {isLoading ? (
              <Skeleton className="h-12 w-48 mx-auto rounded-2xl" />
            ) : (
              <span className="text-4xl font-extrabold font-kanit gradient-success-text">
                {formatNumber(summary?.balance)} บาท
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* เงินที่เก็บมาแล้ว */}
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">เก็บมาแล้ว</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 rounded" />
            ) : (
              <p className="text-xl font-bold text-foreground">{formatNumber(summary?.totalCollected)}</p>
            )}
          </div>

          {/* ยอดค้างชำระ */}
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">ยอดค้างชำระ</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 rounded" />
            ) : (
              <p className="text-xl font-bold text-amber-500">{formatNumber(summary?.totalOutstanding)}</p>
            )}
          </div>

          {/* เงินที่จะเก็บทั้งหมด */}
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">เป้าหมาย</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 rounded" />
            ) : (
              <p className="text-xl font-bold text-blue-500">{formatNumber(summary?.totalExpected)}</p>
            )}
          </div>

          {/* รายจ่าย */}
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
              <Receipt className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">รายจ่าย</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 rounded" />
            ) : (
              <p className="text-xl font-bold text-red-500">{formatNumber(summary?.totalExpenses)}</p>
            )}
          </div>

          {/* จำนวนนิสิต */}
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">จำนวนนิสิต</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 rounded" />
            ) : (
              <p className="text-xl font-bold text-pink-500">{summary?.studentCount ?? "-"} คน</p>
            )}
          </div>

          {/* อัตราการจ่าย */}
          <div className="p-4 glass-card rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
              <CheckCircle className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">อัตราการจ่าย</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 rounded" />
            ) : (
              <p className="text-xl font-bold text-purple-500">
                {summary?.totalExpected && summary.totalExpected > 0 
                  ? Math.round((summary.totalCollected / summary.totalExpected) * 100) 
                  : 0}%
              </p>
            )}
          </div>
        </div>

        {/* Students Payment Status List */}
        <div className="p-6 glass-card rounded-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">สถานะการชำระเงิน</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">เรียงจากยอดค้างมากที่สุด</p>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : allStudents.length > 0 ? (
            <div className="space-y-2">
              {allStudents.map((student, index) => (
                <div
                  key={student.studentId}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    student.isPaidAll ? 'bg-emerald-500/10' : 'bg-background/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{student.studentName}</p>
                      <p className="text-xs text-muted-foreground">{student.studentId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {student.isPaidAll ? (
                      <p className="text-sm font-bold text-emerald-500">✓ จ่ายครบ</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-amber-500">{student.totalAmount.toLocaleString()} บาท</p>
                        <p className="text-xs text-muted-foreground">{student.totalWeeksUnpaid} สัปดาห์</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">ไม่มีข้อมูล</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
