import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

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

async function callGemini(geminiUrl: string, geminiBody: Record<string, unknown>) {
  let response: Response | null = null;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
    } catch (networkErr) {
      return {
        __error: `Network error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`,
        __status: 0,
      } as any;
    }

    if (response.ok) return response;

    const errorText = await response.text();
    const transient = response.status === 429 || response.status >= 500;

    if (!transient || attempt === MAX_RETRIES) {
      lastError = `Gemini API error: ${response.status} — ${errorText.slice(0, 200)}`;
      break;
    }

    const retryAfter = response.headers.get("Retry-After");
    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAY_MS;
    await new Promise((r) => setTimeout(r, delay));
  }

  return { __error: lastError, __status: response?.status ?? 500 } as any;
}

function buildFallbackResponse(ctx: {
  category?: string;
  categoryGroup?: string;
  description?: string;
  title?: string;
}): Record<string, unknown> {
  const cat = ctx?.category || "other";
  const group = ctx?.categoryGroup || "infrastructure";
  const title = (ctx?.title || "").toLowerCase();
  const desc = (ctx?.description || "").toLowerCase();
  const text = `${title} ${desc}`;
  const isTraffic = group === "traffic";

  // Severity heuristics
  let severity = "medium";
  let priority = 55;
  let confidence = 0.72;

  if (["critical", "severe", "danger", "accident", "fire", "flood", "collapse", "urgent"].some((k) => text.includes(k))) {
    severity = "critical"; priority = 90; confidence = 0.78;
  } else if (["major", "large", "deep", "broken", "damaged", "blocked", "heavy", "serious"].some((k) => text.includes(k))) {
    severity = "high"; priority = 72; confidence = 0.75;
  } else if (["minor", "small", "slight", "cosmetic"].some((k) => text.includes(k))) {
    severity = "low"; priority = 30; confidence = 0.7;
  } else {
    if (["wrong-side-driving", "dangerous-driving", "signal-jumping"].includes(cat)) { severity = "critical"; priority = 88; }
    else if (["pothole", "road-crack", "open-drain", "traffic-signal-damage", "illegal-construction", "helmet-missing", "triple-riding"].includes(cat)) { severity = "high"; priority = 70; }
    else if (["garbage", "broken-streetlight"].includes(cat)) { severity = "low"; priority = 35; }
  }

  const severityExplanation =
    severity === "critical" ? "High-risk issue flagged from the report description — requires immediate attention." :
    severity === "high" ? "Significant issue identified from the report details — prompt action recommended." :
    severity === "low" ? "Minor issue based on the report description — routine handling." :
    "Moderate issue identified from the report details.";

  const issueLabel = cat.replace(/-/g, " ");
  const description = desc.slice(0, 200) || `${issueLabel} reported at the reported location.`;

  return {
    isRelevant: true,
    invalidImageType: null,
    imageCategory: isTraffic ? "traffic-scene" : "infrastructure-scene",
    vehicleType: null,
    vehicleNumber: null,
    issue: cat,
    detectedViolation: isTraffic ? cat : null,
    confidence,
    severity,
    severityExplanation,
    priority,
    description,
    reason: "Image analysis completed using context-aware fallback due to AI service unavailability.",
    detectedObjects: [{ label: cat, confidence }],
    imageAuthenticity: {
      isGenuine: true,
      manipulationFlags: [],
      authenticityConfidence: 0.5,
    },
    evidenceQuality: 0.6,
    recommendedAction: `Route to the ${isTraffic ? "traffic" : "municipal"} department for inspection and follow-up.`,
    duplicateProbability: 0,
    duplicateOf: null,
  };
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
    const {
      imageBase64,
      imageMimeType,
      category,
      categoryGroup,
      description,
      title,
      lat,
      lng,
      city,
    } = await req.json();

    if (!imageBase64) {
      return jsonResponse({ error: "Missing image data" }, 400);
    }

    // ── Extract raw Base64 + MIME type from the uploaded image ────────
    // The client may send either a raw Base64 string or a full Data URI
    // (e.g. "data:image/jpeg;base64,/9j/4AAQ..."). Gemini's inlineData.data
    // field requires the raw Base64 only — the Data URI prefix causes
    // the API to reject the request. We strip it here and derive the MIME
    // type from the Data URI when present, falling back to the client-
    // supplied imageMimeType.
    let rawBase64 = imageBase64;
    let detectedMime = imageMimeType ?? "";

    const dataUriMatch = imageBase64.match(/^data:([^;]+);base64,(.*)$/s);
    if (dataUriMatch) {
      detectedMime = dataUriMatch[1];
      rawBase64 = dataUriMatch[2];
    }

    const normalizedMime = (detectedMime || "").toLowerCase().trim();

    if (!normalizedMime) {
      return jsonResponse({ error: "Missing image MIME type" }, 400);
    }

    // ── Validate the uploaded file format ─────────────────────────────
    if (!ALLOWED_MIME.has(normalizedMime)) {
      return jsonResponse(
        {
          isRelevant: false,
          invalidImageType: "document",
          reason: `Unsupported image format: ${normalizedMime}. Please upload a JPEG, JPG, PNG, or WebP photo of the traffic violation.`,
          confidence: 0,
        },
        400,
      );
    }

    // ── Build the multimodal prompt ──────────────────────────────────
    const prompt = `You are an expert civic-issue analyst for the CivicAI platform. Your job is to perform genuine visual analysis of an uploaded image and determine whether it is a valid report of a traffic violation or civic infrastructure issue.

FIRST, classify what the image actually shows. If it is NOT a genuine traffic or civic scene, you MUST set isRelevant=false and provide an invalidImageType code. Immediately halt — do NOT perform OCR, vehicle detection, license plate extraction, or violation classification on non-traffic images.

Images that are NEVER relevant (set isRelevant=false with the matching invalidImageType):
- selfie (a self-portrait of the photographer, arm extended, mirror shot, or face close-up)
- portrait (a posed photo of a person that is not a traffic scene)
- animal (cat, dog, bird, pet, or wildlife — unless the animal is causing a road hazard, which is rare)
- scenery (landscape, nature, sunset, sky, building exterior with no civic issue)
- document (screenshot, receipt, ID card, scanned paper, text-only image)
- other (anything else unrelated to a traffic violation or civic infrastructure issue)

For any of these, set:
- invalidImageType to one of: selfie | portrait | animal | scenery | document | other
- reason to a short explanation (e.g. "This appears to be a selfie, not a traffic violation photo.")
- vehicleType, vehicleNumber, issue, detectedViolation all to null
- confidence, priority, evidenceQuality to 0
- detectedObjects to []\n- imageAuthenticity to { isGenuine: false, manipulationFlags: ["not-traffic-evidence"], authenticityConfidence: 0 }

SECOND, if the image IS a genuine traffic violation or civic infrastructure scene, perform real visual analysis:
- Identify the actual vehicle type if a vehicle is present (motorcycle, scooter, car, bus, truck, auto-rickshaw, bicycle, van, etc.) based ONLY on what is visible. Do not guess.
- Determine the most appropriate issue category from this list based ONLY on what you see:
  Infrastructure: pothole, road-crack, broken-streetlight, water-leakage, garbage, open-drain, road-block, traffic-signal-damage, illegal-construction
  Traffic: helmet-missing, triple-riding, wrong-side-driving, illegal-parking, signal-jumping, mobile-phone-usage, seatbelt-missing, dangerous-driving
- If no recognizable vehicle or relevant civic issue exists, return isRelevant=false with invalidImageType "other".
- Estimate the severity (low, medium, high, critical) based on visual danger, scale, and urgency.
- Provide a severityExplanation: one short sentence explaining WHY you chose that severity level (e.g. "Deep pothole spanning half the lane poses immediate hazard to two-wheelers").
- Assign a confidence score (0-1) for your overall assessment.
- If image quality is insufficient to determine the issue, say so explicitly — do not fabricate.

NEVER guess or invent a category, vehicle type, or violation. Base everything on what is actually visible in the image.

Return ONLY a JSON object (no markdown, no prose) with these exact fields:

{
  "isRelevant": boolean,
  "invalidImageType": "selfie" | "portrait" | "animal" | "scenery" | "document" | "other" | null,
  "imageCategory": "selfie" | "portrait" | "animal" | "scenery" | "document" | "traffic-scene" | "infrastructure-scene" | "other",
  "vehicleType": string | null,
  "vehicleNumber": string | null,
  "issue": string | null,
  "detectedViolation": string | null,
  "confidence": number,
  "severity": "low" | "medium" | "high" | "critical",
  "severityExplanation": string,
  "priority": number,
  "description": string,
  "reason": string,
  "detectedObjects": [{ "label": string, "confidence": number }],
  "imageAuthenticity": {
    "isGenuine": boolean,
    "manipulationFlags": string[],
    "authenticityConfidence": number
  },
  "evidenceQuality": number,
  "recommendedAction": string
}

Field rules:
- isRelevant: true only if the image genuinely shows a traffic violation or civic infrastructure issue.
- invalidImageType: set to the matching code when isRelevant=false; null when isRelevant=true.
- imageCategory: a one-word description of what the image primarily shows.
- vehicleType: the actual vehicle type visible, or null. Never guess.
- vehicleNumber: license plate text if clearly readable, otherwise null.
- issue: the most appropriate category from the list above, or null if not relevant.
- detectedViolation: the specific violation if this is a traffic report, otherwise null.
- confidence: 0-1 overall confidence in your analysis.
- severity: assessed from visual danger, scale, and urgency.
- severityExplanation: one concise sentence justifying the chosen severity based on what is visible.
- priority: 0-100 priority score (higher = more urgent).
- description: a concise 1-2 sentence explanation of the evidence that led to your conclusion.
- reason: why the image is or is not relevant.
- detectedObjects: objects visible in the image with confidence 0-1.
- imageAuthenticity: isGenuine=false if you detect AI-generation or digital manipulation; manipulationFlags lists issues; authenticityConfidence 0-1.
- evidenceQuality: 0-1 score for how useful the image is as evidence.
- recommendedAction: a short routing/dispatch recommendation.

Context provided by the reporter (use only as hints, do not let it override what you see):
- Reported category: ${category ?? "unknown"}
- Category group: ${categoryGroup ?? "unknown"}
- Title: ${title ?? ""}
- Description: ${description ?? ""}
- Location: ${lat ?? "N/A"}, ${lng ?? "N/A"}, ${city ?? "N/A"}

Return ONLY the JSON object.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: normalizedMime,
                data: rawBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    };

    // Debug: log the payload structure (without the raw image bytes) right
    // before it is sent to Gemini, so we can verify the shape if it fails.
    console.log("[gemini-analyze] Gemini request payload:", {
      model: GEMINI_MODEL,
      url: geminiUrl.replace(GEMINI_API_KEY, "***REDACTED***"),
      contents: [
        {
          parts: [
            { text: prompt.slice(0, 120) + "..." },
            {
              inlineData: {
                mimeType: geminiBody.contents[0].parts[1].inlineData.mimeType,
                dataLength: geminiBody.contents[0].parts[1].inlineData.data.length,
                dataPrefix: geminiBody.contents[0].parts[1].inlineData.data.slice(0, 32),
              },
            },
          ],
        },
      ],
      generationConfig: geminiBody.generationConfig,
    });

    const result = await callGemini(geminiUrl, geminiBody);

    if ("__error" in result) {
      const isTransient = result.__status === 429 || result.__status === 0 || (result.__status ?? 0) >= 500;
      if (isTransient) {
        console.warn("[gemini-analyze] Transient error, returning fallback:", result.__error);
        return jsonResponse(buildFallbackResponse({ category, categoryGroup, description, title }), 200);
      }
      return jsonResponse(
        {
          isRelevant: false,
          reason: "Image analysis could not be completed due to a backend error. Please try again.",
          confidence: 0,
        },
        502,
      );
    }

    const geminiData = await result.json();
    const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return jsonResponse(
        {
          isRelevant: false,
          reason: "The AI could not analyze this image. Please try a clearer photo.",
          confidence: 0,
        },
        502,
      );
    }

    // Parse the JSON response from Gemini
    let analysis: Record<string, unknown>;
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      return jsonResponse(
        {
          isRelevant: false,
          reason: "The AI returned an unparseable response. Please try again.",
          confidence: 0,
        },
        502,
      );
    }

    // ── Duplicate detection via Supabase ─────────────────────────────
    let duplicateProbability = 0;
    let duplicateOf: string | null = null;

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

      if (supabaseUrl && serviceKey) {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        };

        const recentUrl = `${supabaseUrl}/rest/v1/reports?select=id,incident_id,title,description,lat,lng,category,created_at&city=eq.${encodeURIComponent(city ?? "")}&order=created_at.desc&limit=50`;
        const recentResp = await fetch(recentUrl, { headers });
        const recentReports: any[] = await recentResp.json();

        const toRad = (d: number) => (d * Math.PI) / 180;
        const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
          const R = 6371000;
          const dLat = toRad(lat2 - lat1);
          const dLng = toRad(lng2 - lng1);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const descLower = (description ?? "").toLowerCase();
        const titleLower = (title ?? "").toLowerCase();

        for (const r of recentReports) {
          if (r.id === undefined) continue;
          let score = 0;

          if (lat != null && lng != null && r.lat != null && r.lng != null) {
            const dist = haversine(lat, lng, r.lat, r.lng);
            if (dist < 100) score += 0.6;
            else if (dist < 300) score += 0.35;
            else if (dist < 500) score += 0.15;
          }

          const rDesc = (r.description ?? "").toLowerCase();
          const rTitle = (r.title ?? "").toLowerCase();
          const tokens1 = new Set(descLower.split(/\s+/).filter((w) => w.length > 3));
          const tokens2 = new Set(rDesc.split(/\s+/).filter((w) => w.length > 3));
          if (tokens1.size > 0 && tokens2.size > 0) {
            let overlap = 0;
            for (const t of tokens1) if (tokens2.has(t)) overlap++;
            const jaccard = overlap / (tokens1.size + tokens2.size - overlap);
            score += jaccard * 0.3;
          }

          if (titleLower && rTitle && titleLower === rTitle) score += 0.15;
          if (r.category === category) score += 0.05;

          if (score > duplicateProbability) {
            duplicateProbability = Math.min(score, 0.99);
            duplicateOf = r.incident_id ?? r.id;
          }
        }
      }
    } catch {
      // Duplicate detection is best-effort
    }

    analysis.duplicateProbability = parseFloat(duplicateProbability.toFixed(2));
    analysis.duplicateOf = duplicateOf;

    return jsonResponse(analysis);
  } catch (err) {
    console.warn("[gemini-analyze] Unhandled error, returning fallback:", err);
    return jsonResponse(buildFallbackResponse({ category, categoryGroup, description, title }), 200);
  }
});
