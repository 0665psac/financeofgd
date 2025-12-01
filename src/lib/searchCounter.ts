// Google Apps Script Web App URL for incrementing search counter
// User needs to deploy a Google Apps Script and paste the URL here
const APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";

export async function incrementSearchCounter(studentId: string): Promise<void> {
  const trimmedId = studentId.trim().replace(/\D/g, "");
  
  if (!trimmedId || APPS_SCRIPT_URL === "https://script.google.com/macros/s/AKfycbxWHC7GLP_KRIO54uXbmYEPpA31dC4O-JAyfQVCv2vi__5_fyRTTZZIfMC_RT5wj7SG/exec") {
    console.log("Search counter not configured or invalid ID");
    return;
  }

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentId: trimmedId }),
    });
    console.log("Search counter incremented for:", trimmedId);
  } catch (error) {
    console.error("Failed to increment search counter:", error);
    // Silent fail - don't interrupt user experience
  }
}
