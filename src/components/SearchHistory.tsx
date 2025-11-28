import { History, X } from "lucide-react";
import { Button } from "./ui/button";

interface SearchHistoryProps {
  history: string[];
  onSelect: (studentId: string) => void;
  onClear: () => void;
}

const SearchHistory = ({ history, onSelect, onClear }: SearchHistoryProps) => {
  if (history.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="w-4 h-4" />
          <span>ประวัติการค้นหาล่าสุด</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive h-auto py-1 px-2"
        >
          <X className="w-3 h-3 mr-1" />
          ล้าง
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((studentId) => (
          <button
            key={studentId}
            onClick={() => onSelect(studentId)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-full 
                       hover:bg-secondary hover:text-secondary-foreground hover:border-secondary
                       transition-all duration-200 shadow-sm"
          >
            {studentId}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;
