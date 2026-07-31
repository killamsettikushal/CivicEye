import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AnalyticsPayload {
  totalReports: number;
  resolvedReports: number;
  pendingReports: number;
  rejectedReports: number;
  verifiedReports: number;
  inProgressReports: number;
  totalCitizens: number;
  activeCitizens: number;
  categoryBreakdown: { category: string; count: number }[];
  severityBreakdown: { severity: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  topLocations: { area: string; count: number; lat: number | null; lng: number | null }[];
  departmentPerformance: { department: string; resolved: number; pending: number }[];
  monthlyTrend: { month: string; count: number }[];
  avgResolutionDays: number | null;
  topCities: { city: string; count: number }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!GEMINI_API_KEY) {
    return jsonResponse(
      { error: "GEMINI_API_KEY is not configured. Set it as an edge function secret." },
      500,
    );
  }

  try {
    const payload: AnalyticsPayload = await req.json();

    if (payload.totalReports === undefined) {
      return jsonResponse({ error: "Missing analytics payload" }, 400);
    }

    const prompt = `You are an expert civic-data analyst for the CivicEye platform — a civic issue reporting and management system used by city administrators. You are given REAL analytics data extracted from the live database. Your job is to generate actionable insights for administrators.

Analyze the following analytics data and produce a concise, structured intelligence report.

REAL ANALYTICS DATA:
- Total reports: ${payload.totalReports}
- Resolved reports: ${payload.resolvedReports}
- Pending reports: ${payload.pendingReports}
- Verified reports: ${payload.verifiedReports}
- In-progress reports: ${payload.inProgressReports}
- Rejected reports: ${payload.rejectedReports}
- Total registered citizens: ${payload.totalCitizens}
- Active citizens (submitted ≥1 report): ${payload.activeCitizens}
- Average resolution time: ${payload.avgResolutionDays !== null ? `${payload.avgResolutionDays.toFixed(1)} days` : 'N/A'}

Category breakdown (issue type → count):
${payload.categoryBreakdown.map((c) => `  - ${c.category}: ${c.count}`).join('\n')}

Severity breakdown:
${payload.severityBreakdown.map((s) => `  - ${s.severity}: ${s.count}`).join('\n')}

Status breakdown:
${payload.statusBreakdown.map((s) => `  - ${s.status}: ${s.count}`).join('\n')}

Top problem locations:
${payload.topLocations.map((l) => `  - ${l.area}: ${l.count} reports`).join('\n')}

Department performance:
${payload.departmentPerformance.map((d) => `  - ${d.department}: ${d.resolved} resolved, ${d.pending} pending`).join('\n')}

Monthly report trend:
${payload.monthlyTrend.map((m) => `  - ${m.month}: ${m.count} reports`).join('\n')}

Top cities:
${payload.topCities.map((c) => `  - ${c.city}: ${c.count} reports`).join('\n')}

Based on this data, generate a structured report. Return ONLY a JSON object with these exact fields (no markdown, no prose outside the JSON):

{
  "summary": "2-3 sentence executive summary of the overall civic health situation",
  "keyFindings": [
    "3-5 bullet points, each a single sentence highlighting a significant trend, pattern, or anomaly in the data"
  ],
  "areasNeedingAttention": [
    "2-3 locations or categories that require immediate administrative focus, each with a one-line reason"
  ],
  "notableImprovements": [
    "1-3 positive trends or improvements visible in the data, each as a single sentence"
  ],
  "recommendations": [
    "3-5 specific, actionable recommendations for administrators. Each should be a concrete action, not a generic suggestion"
  ]
}

Rules:
- Base every finding ONLY on the provided data. Do not invent numbers or trends.
- If totalReports is 0, return a summary saying "No reports have been submitted yet" and empty arrays for the other fields.
- Keep each finding and recommendation to one clear sentence.
- Recommendations should be specific to the data (e.g., if potholes are the top category, recommend dispatching road repair teams to the top pothole locations).
- Return ONLY the JSON object.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    };

    console.log("[gemini-insights] Requesting insights for", payload.totalReports, "reports");

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[gemini-insights] Gemini API error:", response.status, errorText.slice(0, 200));
      return jsonResponse(
        { error: `AI analysis failed (${response.status}). Please try again.` },
        502,
      );
    }

    const geminiData = await response.json();
    const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return jsonResponse(
        { error: "The AI returned an empty response. Please try again." },
        502,
      );
    }

    let insights: Record<string, unknown>;
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch {
      console.error("[gemini-insights] Failed to parse Gemini response:", textContent.slice(0, 200));
      return jsonResponse(
        { error: "The AI returned an unparseable response. Please try again." },
        502,
      );
    }

    return jsonResponse(insights);
  } catch (err) {
    console.error("[gemini-insights] Unhandled error:", err);
    return jsonResponse(
      { error: "An unexpected error occurred while generating insights." },
      500,
    );
  }
});
