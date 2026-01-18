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

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

const SPREADSHEET_ID = "1luO33qY0EXsl0xQHX3grA6ayemyHiIjTx4TsNEWjwB4";

interface RequestBody {
  action: "fetchSheetNames" | "fetchSheetData" | "fetchRange";
  sheetName?: string;
  range?: string;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP);
  
  if (!rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" }),
      { 
        status: 429, 
        headers: { 
          "Content-Type": "application/json", 
          "Retry-After": String(rateLimitResult.retryAfter || 60),
          ...corsHeaders 
        } 
      }
    );
  }

  try {
    const API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    
    if (!API_KEY) {
      console.error("GOOGLE_SHEETS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: RequestBody = await req.json();
    const { action, sheetName, range } = body;

    let url: string;
    
    switch (action) {
      case "fetchSheetNames":
        url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}&fields=sheets.properties.title`;
        break;
        
      case "fetchSheetData":
        if (!sheetName) {
          return new Response(
            JSON.stringify({ error: "Sheet name is required" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        const encodedRange = encodeURIComponent(`'${sheetName}'!B:G`);
        url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
        break;
        
      case "fetchRange":
        if (!range) {
          return new Response(
            JSON.stringify({ error: "Range is required" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        const encodedCustomRange = encodeURIComponent(range);
        url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedCustomRange}?key=${API_KEY}`;
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    console.log(`Fetching: ${action}${sheetName ? ` for sheet: ${sheetName}` : ""}${range ? ` with range: ${range}` : ""}`);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Sheets API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch data from Google Sheets" }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in google-sheets-proxy:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
