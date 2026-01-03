import { useState, useEffect, FormEvent } from "react";
import { Search, RefreshCw, Wallet, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Snowflakes from "@/components/Snowflakes";
import SearchHistory from "@/components/SearchHistory";
import ResultCard from "@/components/ResultCard";
import { searchStudent, SearchResult, clearCache } from "@/lib/searchService";
import { incrementSearchCounter } from "@/lib/searchCounter";
import { fetchTotalAmount } from "@/lib/googleSheets";
import {
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
} from "@/lib/localStorage";

const Index = () => {
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchedId, setSearchedId] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [isTotalLoading, setIsTotalLoading] = useState(true);
  const { toast } = useToast();

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

      // Increment search counter in Google Sheet
      incrementSearchCounter(searchId);

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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-snow dark:bg-[hsl(0,0%,5%)] relative overflow-hidden">
      <Snowflakes />

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="fixed bottom-4 left-4 z-50 p-3 rounded-full bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-300"
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5 text-accent" />
        ) : (
          <Moon className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Main Content */}
      <div className="relative z-10 container max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground dark:text-white mb-2">
            ระบบตรวจสอบยอดค้างชำระ
          </h1>
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            ค่าสาขาเด็กกราฟฟิกและผลิตภัณฑ์
          </p>
          <div className="mt-2 inline-block px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary text-xs rounded-full">
            🎉 Happy New Year 🎉
          </div>
        </header>

        {/* Total Amount Display */}
        <div className="mb-6 p-4 bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">ยอดเงินรวมทั้งหมด</span>
          </div>
          <div className="text-center mt-2">
            {isTotalLoading ? (
              <div className="inline-block w-5 h-5 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
            ) : totalAmount !== null ? (
              <span className="text-2xl font-bold text-green-500">
                {totalAmount.toLocaleString("th-TH")} บาท
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">ไม่สามารถโหลดข้อมูลได้</span>
            )}
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="กรอกรหัสนิสิต"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
              className="pr-24 h-12 text-base bg-card border-border focus:border-primary focus:ring-primary"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRefreshData}
              className="absolute right-12 top-1 h-10 w-10 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1 h-10 w-10 bg-primary hover:bg-primary/90"
              disabled={isLoading || !studentId.trim()}
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </form>

        {/* Search History */}
        {isInputFocused && history.length > 0 && (
          <div className="mb-6">
            <SearchHistory
              history={history}
              onSelect={handleHistorySelect}
              onClear={handleClearHistory}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">กำลังค้นหา...</p>
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
