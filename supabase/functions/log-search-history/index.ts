import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://financeofgd.lovable.app",
  "https://id-preview--eb2d2e7b-ebc4-4b21-86f1-91ed2d5676c1.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// Google Apps Script Web App URL for logging search history
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx4vIcOuDmfNzQUePMRE_FXcuBW4Q-LQHzB2wTkiSmGIdBkBsmjftyeXXv_VvJqhrLn/exec";

interface RequestBody {
  studentId: string;
  studentName: string;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { studentId, studentName } = body;

    if (!studentId || !studentName) {
      return new Response(
        JSON.stringify({ error: "Missing studentId or studentName" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Logging search history for: ${studentId} - ${studentName}`);

    // Forward request to Google Apps Script
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        studentId, 
        studentName 
      }),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in log-search-history:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
