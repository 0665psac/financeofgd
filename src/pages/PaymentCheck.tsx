import { useState, useEffect, FormEvent, useRef } from "react";
import { Search, RefreshCw, Wallet, Users, Receipt, ChevronUp, Lightbulb, Loader2, Copy, Check, TrendingUp, TrendingDown, UserCheck, AlertCircle } from "lucide-react";
import CountUp from "react-countup";
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
import { fetchTotalAmount, fetchSpentAmount, fetchIncomeAmount, fetchStudentCount, fetchAllSheetsData, fetchAllFeeSheetsData, getPricePerWeek } from "@/lib/googleSheets";
import {
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  SearchHistoryItem,
} from "@/lib/localStorage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Prefixes for student ID expansion
const STUDENT_ID_PREFIX_1DIGIT = "681061000";  // 9 digits + 1 = 10
const STUDENT_ID_PREFIX_2DIGIT = "68106100";   // 8 digits + 2 = 10
const STUDENT_ID_PREFIX_3DIGIT = "6810610";    // 7 digits + 3 = 10

// Expand short input (1-3 digits) to full student ID
// Logic: 1 digit → 681061000X, 2 digits → 68106100XX, 3 digits → 6810610XXX
// Leading zeros are removed first: 01→1 (1-digit), 001→1 (1-digit), 016→16 (2-digit)
function expandShortInput(input: string): string[] {
  const trimmed = input.trim();
  
  // Check if it's a short input (1-3 characters that are all digits)
  if (!/^\d{1,3}$/.test(trimmed)) {
    // Not a 1-3 digit input, return as-is (remove non-digits)
    return [trimmed.replace(/\D/g, "")];
  }
  
  // Convert to number to remove leading zeros, then determine digit count
  const numericValue = parseInt(trimmed, 10);
  const numericStr = numericValue.toString();
  const digitCount = numericStr.length;
  
  if (digitCount === 1) {
    // 1 digit: 681061000 + X = 10 digits
    return [STUDENT_ID_PREFIX_1DIGIT + numericStr];
  } else if (digitCount === 2) {
    // 2 digits: 68106100 + XX = 10 digits
    return [STUDENT_ID_PREFIX_2DIGIT + numericStr];
  } else {
    // 3 digits: 6810610 + XXX = 10 digits
    return [STUDENT_ID_PREFIX_3DIGIT + numericStr];
  }
}

interface StudentPaymentStatus {
  studentId: string;
  studentName: string;
  totalWeeksUnpaid: number;
  totalAmount: number;
  paidAmount: number;
  isPaidAll: boolean;
}

const PaymentCheck = () => {
  
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchedId, setSearchedId] = useState("");
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [spentAmount, setSpentAmount] = useState<number | null>(null);
  const [incomeAmount, setIncomeAmount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [isTotalLoading, setIsTotalLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<StudentPaymentStatus[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [isPaymentStatusOpen, setIsPaymentStatusOpen] = useState(false);
  const [disambiguationOptions, setDisambiguationOptions] = useState<{ id: string; name: string }[]>([]);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  
  const { toast } = useToast();



  useEffect(() => {
    setHistory(getSearchHistory());
    loadData();
  }, []);

  const loadData = async () => {
    setIsTotalLoading(true);
    setIsStudentsLoading(true);
    try {
      const [amount, spent, income, count, sheetsData, feesData] = await Promise.all([
        fetchTotalAmount(),
        fetchSpentAmount(),
        fetchIncomeAmount(),
        fetchStudentCount(),
        fetchAllSheetsData(),
        fetchAllFeeSheetsData(),
      ]);
      setTotalAmount(amount);
      setSpentAmount(spent);
      setIncomeAmount(income);
      setStudentCount(count);
      
      // Calculate total outstanding per student across all months + fee sheets
      const studentMap = new Map<string, StudentPaymentStatus>();
      
      for (const sheet of sheetsData) {
        const weeklyRate = getPricePerWeek(sheet.sheetName);
        
        for (const record of sheet.records) {
          const weeksUnpaid = [record.week1, record.week2, record.week3, record.week4].filter(w => !w).length;
          const weeksPaid = 4 - weeksUnpaid;
          const paidInSheet = weeksPaid * weeklyRate;
          const outstandingInSheet = weeksUnpaid * weeklyRate;
          
          const existing = studentMap.get(record.studentId);
          if (existing) {
            existing.totalWeeksUnpaid += weeksUnpaid;
            existing.totalAmount += outstandingInSheet;
            existing.paidAmount += paidInSheet;
            if (weeksUnpaid > 0) existing.isPaidAll = false;
          } else {
            studentMap.set(record.studentId, {
              studentId: record.studentId,
              studentName: record.studentName,
              totalWeeksUnpaid: weeksUnpaid,
              totalAmount: outstandingInSheet,
              paidAmount: paidInSheet,
              isPaidAll: weeksUnpaid === 0,
            });
          }
        }
      }

      // Include fee sheets so drawer totals match ResultCard
      for (const fee of feesData) {
        for (const record of fee.records) {
          const required = fee.requiredAmount;
          const paid = record.isFullyPaid ? required : record.paidAmount;
          const outstanding = record.isFullyPaid ? 0 : Math.max(0, required - record.paidAmount);

          const existing = studentMap.get(record.studentId);
          if (existing) {
            existing.totalAmount += outstanding;
            existing.paidAmount += paid;
            if (outstanding > 0) existing.isPaidAll = false;
          } else {
            studentMap.set(record.studentId, {
              studentId: record.studentId,
              studentName: record.studentName,
              totalWeeksUnpaid: 0,
              totalAmount: outstanding,
              paidAmount: paid,
              isPaidAll: outstanding === 0,
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input = studentId.trim().replace(/\D/g, "");
    
    // If input is 1-3 digits, expand to possible full IDs
    if (input.length >= 1 && input.length <= 3) {
      const possibleIds = expandShortInput(input);
      
      // Find which IDs actually exist in our data
      const validOptions: { id: string; name: string }[] = [];
      for (const possibleId of possibleIds) {
        const student = allStudents.find(s => s.studentId === possibleId);
        if (student) {
          validOptions.push({ id: student.studentId, name: student.studentName });
        }
      }
      
      if (validOptions.length === 0) {
        // No matches found, try searching with the first expanded ID
        handleSearch(possibleIds[0]);
      } else if (validOptions.length === 1) {
        // Only one match, search directly and save to history
        const matchedStudent = validOptions[0];
        setStudentId(matchedStudent.id);
        // Save to history immediately since we already know the student exists
        addToSearchHistory(matchedStudent.id, matchedStudent.name);
        logSearchHistory(matchedStudent.id, matchedStudent.name);
        setHistory(getSearchHistory());
        handleSearch(matchedStudent.id);
      } else {
        // Multiple matches, show disambiguation dialog
        setDisambiguationOptions(validOptions);
        setShowDisambiguation(true);
      }
    } else {
      // Full ID entered, search directly
      handleSearch();
    }
  };

  const handleDisambiguationSelect = (selectedOption: { id: string; name: string }) => {
    setShowDisambiguation(false);
    setStudentId(selectedOption.id);
    // Save to history immediately since we already know the student exists
    addToSearchHistory(selectedOption.id, selectedOption.name);
    logSearchHistory(selectedOption.id, selectedOption.name);
    setHistory(getSearchHistory());
    handleSearch(selectedOption.id);
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

  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAll = async () => {
    const unpaidStudents = allStudents.filter(s => !s.isPaidAll);
    if (unpaidStudents.length === 0) {
      toast({
        title: "ไม่มียอดค้างชำระ",
        description: "ทุกคนจ่ายครบแล้ว",
      });
      return;
    }
    const totalOutstanding = unpaidStudents.reduce((sum, s) => sum + s.totalAmount, 0);

    const lines = unpaidStudents.map((s, i) => {
      return `${i + 1}. ${s.studentName} (${s.studentId}) - ${s.totalAmount.toLocaleString()} บาท`;
    });

    const text = `รายชื่อผู้ที่ยังค้างชำระ (${unpaidStudents.length} คน)\nยอดค้างรวม: ${totalOutstanding.toLocaleString()} บาท\n\n${lines.join("\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      toast({
        title: "คัดลอกสำเร็จ",
        description: `คัดลอกรายชื่อผู้ค้างชำระ ${unpaidStudents.length} คนแล้ว`,
      });
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast({
        title: "คัดลอกไม่สำเร็จ",
        description: "กรุณาลองอีกครั้ง",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen mesh-gradient-bg relative overflow-hidden">
      <Snowflakes />

      {/* Main Content */}
      <div className="relative z-10 container max-w-md mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              ระบบตรวจสอบยอดค้างชำระ
            </h1>
            <p className="text-sm text-muted-foreground">
              ค่าสาขากราฟิกและผลิตภัณฑ์
            </p>
          </div>
        </header>

        {/* Per-Person Remaining - Glassmorphism */}
        <div className="mb-6">
          <div className="p-5 glass-card rounded-3xl">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-full gradient-success flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs text-muted-foreground">ยอดคงเหลือต่อคน</span>
            </div>
            <div className="text-center mt-2">
              {isTotalLoading ? (
                <Skeleton className="h-10 w-40 mx-auto rounded-2xl" />
              ) : totalAmount !== null && studentCount && studentCount > 0 ? (
                <span className="text-3xl font-extrabold font-kanit gradient-success-text">
                  <CountUp
                    end={totalAmount / studentCount}
                    duration={2}
                    separator=","
                    decimals={2}
                    decimal="."
                    suffix=" บาท"
                  />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">ไม่สามารถโหลดข้อมูลได้</span>
              )}
            </div>
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

          {/* Hint for short ID search - show only when no history */}
          {history.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>สามารถกรอกรหัสนิสิตแค่ 1-3 ตัวท้ายได้เลย</span>
            </p>
          )}
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

        {/* Payment Status Section - Fixed at bottom, expands to cover content but not header */}
        {isPaymentStatusOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/20" 
            onClick={() => setIsPaymentStatusOpen(false)}
          />
        )}
        <div className={`fixed left-0 right-0 z-50 transition-all duration-300 ${isPaymentStatusOpen ? 'top-[120px] bottom-0' : 'bottom-0'}`}>
          <div className="container max-w-md mx-auto px-4 h-full">
            <Collapsible open={isPaymentStatusOpen} onOpenChange={setIsPaymentStatusOpen} className="h-full flex flex-col">
              <div className={`glass-card rounded-t-3xl overflow-hidden flex flex-col ${isPaymentStatusOpen ? 'h-full' : ''}`}>
                <CollapsibleContent className="flex-1 overflow-y-auto">
                  {/* Summary */}
                  <div className="p-4 space-y-2">
                    {/* Row 1: Income / Expense / Remaining */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          <p className="text-xs text-muted-foreground">รายรับ</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-500">
                          {incomeAmount !== null ? incomeAmount.toLocaleString() : "-"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-red-500/10 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          <p className="text-xs text-muted-foreground">รายจ่าย</p>
                        </div>
                        <p className="text-sm font-bold text-red-500">
                          {spentAmount !== null ? spentAmount.toLocaleString() : "-"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/10 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Wallet className="w-3 h-3 text-amber-500" />
                          <p className="text-xs text-muted-foreground">คงเหลือ</p>
                        </div>
                        <p className="text-sm font-bold text-amber-500">
                          {totalAmount !== null ? totalAmount.toLocaleString() : "-"}
                        </p>
                      </div>
                    </div>

                    {/* Row 2: Paid / Unpaid / Outstanding */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <UserCheck className="w-3 h-3 text-emerald-500" />
                          <p className="text-xs text-muted-foreground">จ่ายครบ</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-500">
                          {allStudents.filter(s => s.isPaidAll).length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">คน</p>
                      </div>
                      <div className="p-3 rounded-xl bg-red-500/10 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          <p className="text-xs text-muted-foreground">ยังค้าง</p>
                        </div>
                        <p className="text-sm font-bold text-red-500">
                          {allStudents.filter(s => !s.isPaidAll).length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">คน</p>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/10 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Receipt className="w-3 h-3 text-amber-500" />
                          <p className="text-xs text-muted-foreground">ยอดค้าง</p>
                        </div>
                        <p className="text-sm font-bold text-amber-500">
                          {allStudents.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">บาท</p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all h-9 text-sm"
                      onClick={handleCopyAll}
                      disabled={isStudentsLoading || allStudents.filter(s => !s.isPaidAll).length === 0}
                    >
                      {copiedAll ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                      คัดลอกรายชื่อผู้ค้างชำระ
                    </Button>
                  </div>
                  
                  
                  <p className="text-xs text-muted-foreground px-4 mb-3">เรียงจากยอดค้างมากที่สุด</p>
                  
                  {isStudentsLoading ? (
                    <div className="space-y-2 px-4 pb-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : allStudents.length > 0 ? (
                    <div className="space-y-2 px-4 pb-4">
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
                              <>
                                <p className="text-sm font-bold text-emerald-500">✓ จ่ายครบ</p>
                                <p className="text-xs text-emerald-500/70">{student.paidAmount.toLocaleString()} บาท</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-bold text-red-500">{student.totalAmount.toLocaleString()} บาท</p>
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
                
                <CollapsibleTrigger className="w-full p-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-500" />
                      <h2 className="text-base font-bold text-foreground">สถานะการชำระเงินทั้งหมด</h2>
                    </div>
                    {isStudentsLoading ? (
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    ) : (
                      <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform ${isPaymentStatusOpen ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </CollapsibleTrigger>
              </div>
            </Collapsible>
          </div>
        </div>
        
        {/* Spacer for fixed bottom section */}
        <div className="h-20"></div>

        {/* Disambiguation Dialog */}
        <Dialog open={showDisambiguation} onOpenChange={setShowDisambiguation}>
          <DialogContent className="w-[calc(100%-3rem)] max-w-sm glass-card border-0 rounded-3xl mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center">เลือกรหัสนิสิต</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {disambiguationOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleDisambiguationSelect(option)}
                  className="w-full p-4 rounded-xl bg-background/50 hover:bg-primary/10 
                           transition-all duration-200 text-left border border-border/50 hover:border-primary/30"
                >
                  <p className="font-medium text-foreground">{option.name}</p>
                  <p className="text-sm text-muted-foreground">{option.id}</p>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PaymentCheck;
