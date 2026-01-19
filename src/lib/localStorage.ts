const HISTORY_KEY = "student_search_history_v2";
const MAX_HISTORY = 5;

export interface SearchHistoryItem {
  studentId: string;
  studentName: string;
}

export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(studentId: string, studentName: string): void {
  try {
    const history = getSearchHistory();
    
    // Remove if already exists (to move to front)
    const filtered = history.filter((item) => item.studentId !== studentId);
    
    // Add to front
    filtered.unshift({ studentId, studentName });
    
    // Keep only last MAX_HISTORY items
    const trimmed = filtered.slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Silently fail
  }
}

