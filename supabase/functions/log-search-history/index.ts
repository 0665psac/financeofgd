import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google Apps Script Web App URL for logging search history
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx4vIcOuDmfNzQUePMRE_FXcuBW4Q-LQHzB2wTkiSmGIdBkBsmjftyeXXv_VvJqhrLn/exec";

interface RequestBody {
  studentId: string;
  studentName: string;
}

serve(async (req: Request): Promise<Response> => {
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
