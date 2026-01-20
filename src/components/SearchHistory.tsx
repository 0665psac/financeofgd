import { History, X, User } from "lucide-react";
import { Button } from "./ui/button";
import { SearchHistoryItem } from "@/lib/localStorage";

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSelect: (studentId: string) => void;
  onClear: () => void;
}

const SearchHistory = ({ history, onSelect, onClear }: SearchHistoryProps) => {
  if (history.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-50 animate-fade-in">
      <div className="glass-card rounded-2xl p-4 shadow-xl border border-white/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="w-4 h-4" />
            <span>ประวัติการค้นหา</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }}
            className="text-xs text-muted-foreground hover:text-destructive h-auto py-1 px-2"
          >
            <X className="w-3 h-3 mr-1" />
            ล้างทั้งหมด
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          {history.map((item) => (
            <button
              key={item.studentId}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(item.studentId);
              }}
              className="w-full text-left px-3 py-2.5 text-sm rounded-xl
                         hover:bg-primary/10 hover:text-primary
                         transition-all duration-200 flex items-center gap-3"
            >
              <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{item.studentName}</p>
                <p className="text-xs text-muted-foreground">{item.studentId}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchHistory;