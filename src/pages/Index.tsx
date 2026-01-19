import { useState, useEffect, FormEvent, useRef } from "react";
import { Search, RefreshCw, Wallet, Users, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import Snowflakes from "@/components/Snowflakes";
import SearchHistory from "@/components/SearchHistory";
import ResultCard from "@/components/ResultCard";
import { searchStudent, SearchResult, clearCache } from "@/lib/searchService";
import { logSearchHistory } from "@/lib/searchCounter";
import { fetchTotalAmount, fetchAllSheetsData, isNovember68OrNewer } from "@/lib/googleSheets";
import {
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  SearchHistoryItem,
} from "@/lib/localStorage";

interface StudentPaymentStatus {
  studentId: string;
  studentName: string;
  totalWeeksUnpaid: number;
  totalAmount: number;
  isPaidAll: boolean;
}

const Index = () => {
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchedId, setSearchedId] = useState("");
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [isTotalLoading, setIsTotalLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<StudentPaymentStatus[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [isPaymentStatusOpen, setIsPaymentStatusOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setHistory(getSearchHistory());
    loadData();
  }, []);

  const loadData = async () => {
    setIsTotalLoading(true);
    setIsStudentsLoading(true);
    try {
      const [amount, sheetsData] = await Promise.all([
        fetchTotalAmount(),
        fetchAllSheetsData()
      ]);
      setTotalAmount(amount);
      
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
      console.error("Error loading data:", error);
    } finally {
      setIsTotalLoading(false);
      setIsStudentsLoading(false);
    }
  };

  const handleSearch = async (id?: string) => {
    const searchId = (id || studentId).trim();
    if (!searchId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const searchResult = await searchStudent(searchId);
      setResult(searchResult);
      setSearchedId(searchId);

      // Log search history to Google Sheet and save to local history (only if student found)
      if (searchResult.found && searchResult.studentName) {
        logSearchHistory(searchId, searchResult.studentName);
        addToSearchHistory(searchId, searchResult.studentName);
        setHistory(getSearchHistory());
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleHistorySelect = (id: string) => {
    setStudentId(id);
    handleSearch(id);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const handleRefreshData = async () => {
    clearCache();
    await loadData();
    
    // Re-search if there's an existing search result
    if (searchedId) {
      await handleSearch(searchedId);
    }
    
    toast({
      title: "รีเฟรชข้อมูลแล้ว",
      description: "อัพเดตข้อมูลทั้งหมดเรียบร้อยแล้ว",
    });
  };

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden">
      <Snowflakes />

      {/* Main Content */}
      <div className="relative z-10 container max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            ระบบตรวจสอบยอดค้างชำระ
          </h1>
          <p className="text-sm text-muted-foreground">
            ค่าสาขาเด็กกราฟิกและผลิตภัณฑ์
          </p>
          <div className="mt-2 inline-block px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
            🎉 Happy New Year 🎉
          </div>
        </header>

        {/* Total Amount Display - Glassmorphism */}
        <div className="mb-6 p-6 glass-card rounded-3xl">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-success flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">ยอดเงินรวมทั้งหมด</span>
          </div>
          <div className="text-center mt-3">
            {isTotalLoading ? (
              <Skeleton className="h-12 w-40 mx-auto rounded-2xl" />
            ) : totalAmount !== null ? (
              <span className="text-4xl font-extrabold font-kanit gradient-success-text">
                {totalAmount.toLocaleString("th-TH")} บาท
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">ไม่สามารถโหลดข้อมูลได้</span>
            )}
          </div>
        </div>

        {/* Search Form - Floating Pill with Dropdown */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <div className="pill-input rounded-full p-1.5">
              <div className="flex items-center">
                <div className="pl-4 pr-2">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="กรอกรหัสนิสิต"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setTimeout(() => setIsInputFocused(false), 150)}
                  className="flex-1 border-0 bg-transparent h-11 text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshData}
                  disabled={isTotalLoading}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full"
                >
                  <RefreshCw className={`w-4 h-4 ${isTotalLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 rounded-full gradient-success hover:opacity-90 transition-opacity"
                  disabled={isLoading || !studentId.trim()}
                >
                  <Search className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>

            {/* Search History Dropdown */}
            {isInputFocused && history.length > 0 && (
              <SearchHistory
                history={history}
                onSelect={handleHistorySelect}
                onClear={handleClearHistory}
              />
            )}
          </div>
        </form>

        {/* Loading State - Glassmorphism */}
        {isLoading && (
          <div className="p-6 glass-card rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <ResultCard result={result} studentId={searchedId} />
        )}

        {/* Payment Status Section - Only show after search */}
        {result && !isLoading && (
          <Collapsible open={isPaymentStatusOpen} onOpenChange={setIsPaymentStatusOpen}>
            <div className="mt-6 p-4 glass-card rounded-3xl">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base font-bold text-foreground">สถานะการชำระเงินทั้งหมด</h2>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isPaymentStatusOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                {/* Summary */}
                <div className="mt-3 space-y-2">
                  <div className="p-3 rounded-xl bg-amber-500/10 flex items-center justify-between">
                    <span className="text-sm text-foreground">ยอดค้างรวมทั้งหมด</span>
                    <span className="text-base font-bold text-amber-500">
                      {allStudents.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 rounded-xl bg-red-500/10 text-center">
                      <p className="text-lg font-bold text-red-500">{allStudents.filter(s => !s.isPaidAll).length}</p>
                      <p className="text-xs text-muted-foreground">ยังค้างชำระ</p>
                    </div>
                    <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 text-center">
                      <p className="text-lg font-bold text-emerald-500">{allStudents.filter(s => s.isPaidAll).length}</p>
                      <p className="text-xs text-muted-foreground">จ่ายครบแล้ว</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-3 mb-3">เรียงจากยอดค้างมากที่สุด</p>
                
                {isStudentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : allStudents.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {allStudents.map((student, index) => (
                      <div
                        key={student.studentId}
                        className={`flex items-center justify-between p-3 rounded-xl ${
                          student.isPaidAll ? 'bg-emerald-500/10' : 'bg-background/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
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
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>
    </div>
  );
};

export default Index;
