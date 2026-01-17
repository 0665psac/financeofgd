import { supabase } from "@/integrations/supabase/client";

export async function logSearchHistory(studentId: string, studentName: string): Promise<void> {
  const trimmedId = studentId.trim().replace(/\D/g, "");
  
  if (!trimmedId || !studentName) {
    return;
  }

  try {
    // Use edge function to log search history securely
    await supabase.functions.invoke("log-search-history", {
      body: { 
        studentId: trimmedId, 
        studentName: studentName 
      },
    });
  } catch (error) {
    // Silent fail - don't interrupt user experience
    if (import.meta.env.DEV) {
      console.error("Failed to log search history:", error);
    }
  }
}
