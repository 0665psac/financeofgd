import { useState, useEffect, FormEvent, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCw, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import Snowflakes from "@/components/Snowflakes";
import SearchHistory from "@/components/SearchHistory";
import ResultCard from "@/components/ResultCard";
import { searchStudent, SearchResult, clearCache } from "@/lib/searchService";
import { logSearchHistory } from "@/lib/searchCounter";
import { fetchTotalAmount } from "@/lib/googleSheets";
import {
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
} from "@/lib/localStorage";

const Index = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchedId, setSearchedId] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [isTotalLoading, setIsTotalLoading] = useState(true);
  const { toast } = useToast();

  // Secret dashboard access: triple click within 3 seconds
  const clickTimesRef = useRef<number[]>([]);
  
  const handleTotalAmountClick = () => {
    const now = Date.now();
    clickTimesRef.current.push(now);
    
    // Keep only clicks within the last 3 seconds
    clickTimesRef.current = clickTimesRef.current.filter(
      (time) => now - time < 3000
    );
    
    // Navigate to dashboard if 3 clicks within 3 seconds
    if (clickTimesRef.current.length >= 3) {
      clickTimesRef.current = [];
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    setHistory(getSearchHistory());
    
    // Fetch total amount on load
    const loadTotalAmount = async () => {
      setIsTotalLoading(true);
      const amount = await fetchTotalAmount();
      setTotalAmount(amount);
      setIsTotalLoading(false);
    };
    loadTotalAmount();
  }, []);

  const handleSearch = async (id?: string) => {
    const searchId = (id || studentId).trim();
    if (!searchId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const searchResult = await searchStudent(searchId);
      setResult(searchResult);
      setSearchedId(searchId);

      // Log search history to Google Sheet (only if student found)
      if (searchResult.found && searchResult.studentName) {
        logSearchHistory(searchId, searchResult.studentName);
      }

      // Save to history
      addToSearchHistory(searchId);
      setHistory(getSearchHistory());
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
    setIsTotalLoading(true);
    try {
      const amount = await fetchTotalAmount();
      setTotalAmount(amount);
    } catch (error) {
      console.error("Error refreshing total amount:", error);
    } finally {
      setIsTotalLoading(false);
    }
    toast({
      title: "รีเฟรชข้อมูลแล้ว",
      description: "ระบบจะดึงข้อมูลใหม่ในการค้นหาครั้งถัดไป",
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
        <div 
          className="mb-6 p-6 glass-card rounded-3xl cursor-pointer select-none"
          onClick={handleTotalAmountClick}
        >
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
      </div>
    </div>
  );
};

export default Index;
