import { useState, useEffect, FormEvent } from "react";
import { Search, Gift, TreePine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Snowflakes from "@/components/Snowflakes";
import SearchHistory from "@/components/SearchHistory";
import ResultCard from "@/components/ResultCard";
import { searchStudent, SearchResult } from "@/lib/searchService";
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

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const handleSearch = async (id?: string) => {
    const searchId = (id || studentId).trim();
    if (!searchId) return;

    setIsLoading(true);
    setResult(null);

    // Simulate network delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    const searchResult = searchStudent(searchId);
    setResult(searchResult);
    setSearchedId(searchId);

    // Save to history
    addToSearchHistory(searchId);
    setHistory(getSearchHistory());

    setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-snow relative overflow-hidden">
      <Snowflakes />

      {/* Main Content */}
      <div className="relative z-10 container max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-3">
            <TreePine className="w-8 h-8 text-secondary" />
            <Gift className="w-6 h-6 text-primary float-animation" />
            <TreePine className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            ระบบตรวจสอบยอดค้างชำระ
          </h1>
          <p className="text-sm text-muted-foreground">
            ค่าส่วนกลางนิสิต สาขากราฟิกดีไซน์
          </p>
          <div className="mt-2 inline-block px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
            🎄 Merry Christmas 🎄
          </div>
        </header>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="กรอกรหัสนิสิต เช่น 6501234567"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="pr-12 h-12 text-base bg-card border-border focus:border-primary focus:ring-primary"
              disabled={isLoading}
            />
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
        <div className="mb-6">
          <SearchHistory
            history={history}
            onSelect={handleHistorySelect}
            onClear={handleClearHistory}
          />
        </div>

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

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>Finance of Graphic Design © 2024</p>
          <p className="mt-1">🎅 สุขสันต์วันคริสต์มาส 🎅</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
