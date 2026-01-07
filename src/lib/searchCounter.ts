// Google Apps Script Web App URL for logging search history
// User needs to deploy a Google Apps Script and paste the URL here
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx4vIcOuDmfNzQUePMRE_FXcuBW4Q-LQHzB2wTkiSmGIdBkBsmjftyeXXv_VvJqhrLn/exec";

export async function logSearchHistory(studentId: string, studentName: string): Promise<void> {
  const trimmedId = studentId.trim().replace(/\D/g, "");
  
  if (!trimmedId || !studentName) {
    console.log("Search history not logged: missing ID or name");
    return;
  }

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        studentId: trimmedId, 
        studentName: studentName 
      }),
    });
    console.log("Search history logged for:", trimmedId, studentName);
  } catch (error) {
    console.error("Failed to log search history:", error);
    // Silent fail - don't interrupt user experience
  }
}
