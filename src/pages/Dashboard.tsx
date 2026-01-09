import { useState, useEffect } from "react";
import { ArrowLeft, Users, TrendingUp, DollarSign, Wallet, Receipt, RefreshCw, ChevronRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { fetchDashboardSummary, fetchMonthlyStudents, DashboardSummary, MonthlyStudentStatus } from "@/lib/googleSheets";
import MonthDetailDialog from "@/components/MonthDetailDialog";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  
  // Month detail dialog state
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthStudents, setMonthStudents] = useState<MonthlyStudentStatus[]>([]);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
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

  const handleMonthClick = async (month: string) => {
    setSelectedMonth(month);
    setIsLoadingMonth(true);
    setMonthStudents([]);
    
    try {
      const students = await fetchMonthlyStudents(month);
      setMonthStudents(students);
    } catch (error) {
      console.error("Error loading month students:", error);
    } finally {
      setIsLoadingMonth(false);
    }
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
          <div className="p-4 glass-card rounded-2xl col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">จำนวนนิสิต</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 rounded" />
                ) : (
                  <p className="text-xl font-bold text-foreground">{summary?.studentCount ?? "-"} คน</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="p-6 glass-card rounded-3xl">
          <h2 className="text-lg font-bold text-foreground mb-4">รายละเอียดรายเดือน</h2>
          <p className="text-xs text-muted-foreground mb-3">คลิกที่เดือนเพื่อดูรายละเอียด</p>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : summary?.monthlyData && summary.monthlyData.length > 0 ? (
            <div className="space-y-3">
              {summary.monthlyData.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleMonthClick(item.month)}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-xl cursor-pointer hover:bg-background/80 transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{item.month}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-4 text-xs">
                      <span className="text-emerald-500">
                        +{item.collected.toLocaleString()}
                      </span>
                      {item.outstanding > 0 && (
                        <span className="text-amber-500">
                          ค้าง {item.outstanding.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">ไม่มีข้อมูล</p>
          )}
        </div>
      </div>

      {/* Month Detail Dialog */}
      <MonthDetailDialog
        open={!!selectedMonth}
        onOpenChange={(open) => !open && setSelectedMonth(null)}
        month={selectedMonth || ""}
        students={monthStudents}
        isLoading={isLoadingMonth}
      />
    </div>
  );
};

export default Dashboard;
