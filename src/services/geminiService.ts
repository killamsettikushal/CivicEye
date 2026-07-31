import { supabase } from '@/services/supabaseClient';

export interface GeminiImageAnalysisResult {
  isRelevant: boolean;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  issue?: string | null;
  detectedViolation?: string | null;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  severityExplanation?: string;
  priority: number;
  description: string;
  reason: string;
  detectedObjects: { label: string; confidence: number }[];
  imageAuthenticity?: {
    isGenuine: boolean;
    manipulationFlags: string[];
    authenticityConfidence: number;
  };
  evidenceQuality: number;
  recommendedAction: string;
  duplicateProbability: number;
  duplicateOf?: string | null;
  rateLimited?: boolean;
  imageCategory?: string;
  invalidImageType?: string;
}

export interface VoiceComplaintRecord {
  id: string;
  reporterId: string;
  audioPath: string;
  audioUrl: string;
  detectedLanguage: string;
  originalTranscript: string;
  englishTranslation: string;
  confidence: number | null;
  category: string;
  severity: string;
  department: string;
  priorityScore: number;
  lat: number | null;
  lng: number | null;
  address: string;
  city: string;
  evidenceUrls: string[];
  createdAt: string;
}

/**
 * Analyzes image pixels via HTML Canvas for skin-tone / selfie / document detection
 * as a local safety layer when AI edge service is fallback/offline.
 */
async function analyzeImagePixelsLocally(
  imageBase64: string,
  imageMimeType: string,
  category: string
): Promise<GeminiImageAnalysisResult | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const src = imageBase64.startsWith('data:') ? imageBase64 : `data:${imageMimeType};base64,${imageBase64}`;
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        const width = 120;
        const height = Math.round((img.height / img.width) * 120) || 120;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        let skinPixelCount = 0;
        let whiteDocumentPixelCount = 0;
        let roadAsphaltPixelCount = 0;
        const totalPixels = width * height;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          // Skin tone detection algorithm (peer-reviewed RGB skin color model)
          const isSkin =
            r > 95 &&
            g > 40 &&
            b > 20 &&
            Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
            Math.abs(r - g) > 15 &&
            r > g &&
            r > b;

          if (isSkin) skinPixelCount++;

          // Document / screenshot detection (high white background)
          if (r > 230 && g > 230 && b > 230) whiteDocumentPixelCount++;

          // Road / Asphalt detection (dark gray/slate textures)
          if (r < 110 && g < 110 && b < 110 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
            roadAsphaltPixelCount++;
          }
        }

        const skinRatio = skinPixelCount / totalPixels;
        const docRatio = whiteDocumentPixelCount / totalPixels;
        const roadRatio = roadAsphaltPixelCount / totalPixels;

        // If skin tone ratio is high, it's a selfie or portrait
        if (skinRatio > 0.12) {
          return resolve({
            isRelevant: false,
            invalidImageType: 'selfie',
            imageCategory: 'selfie',
            confidence: 0.92,
            severity: 'low',
            severityExplanation: 'Image rejected: Selfie or personal portrait detected.',
            priority: 0,
            description: 'This image appears to be a selfie or face portrait, not a valid photo of a civic issue.',
            reason: `Image rejected: This photo appears to be a selfie or personal portrait. It does not show a ${category || 'civic issue'} or traffic violation. Please upload a clear photo of the actual issue.`,
            detectedObjects: [{ label: 'person/selfie', confidence: 0.92 }],
            imageAuthenticity: { isGenuine: false, manipulationFlags: ['non-civic-content'], authenticityConfidence: 0 },
            evidenceQuality: 0,
            recommendedAction: 'Upload a photo showing the road damage or traffic issue.',
            duplicateProbability: 0,
          });
        }

        // If document screenshot
        if (docRatio > 0.65) {
          return resolve({
            isRelevant: false,
            invalidImageType: 'document',
            imageCategory: 'document',
            confidence: 0.88,
            severity: 'low',
            severityExplanation: 'Image rejected: Text document or screenshot detected.',
            priority: 0,
            description: 'This image appears to be a document or screenshot, not a physical civic issue.',
            reason: `Image rejected: Document or screenshot detected. Please upload an actual photo of the ${category || 'civic issue'}.`,
            detectedObjects: [{ label: 'document/text', confidence: 0.88 }],
            imageAuthenticity: { isGenuine: false, manipulationFlags: ['document-screenshot'], authenticityConfidence: 0 },
            evidenceQuality: 0,
            recommendedAction: 'Upload a photo showing the road damage or traffic issue.',
            duplicateProbability: 0,
          });
        }

        // If user selected pothole/road hazard but image has virtually no asphalt/road textures
        if ((category === 'pothole' || category === 'road-crack') && roadRatio < 0.05 && skinRatio > 0.08) {
          return resolve({
            isRelevant: false,
            invalidImageType: 'other',
            imageCategory: 'other',
            confidence: 0.85,
            severity: 'low',
            severityExplanation: 'Image rejected: No road surface or pothole detected.',
            priority: 0,
            description: 'Image does not match the selected issue ("Pothole").',
            reason: 'Image rejected: The photo does not contain a road surface or pothole damage. Please upload a clear photo of the pothole.',
            detectedObjects: [],
            imageAuthenticity: { isGenuine: true, manipulationFlags: [], authenticityConfidence: 0.5 },
            evidenceQuality: 0,
            recommendedAction: 'Upload a photo of the pothole.',
            duplicateProbability: 0,
          });
        }

        resolve(null);
      };

      img.onerror = () => resolve(null);
      img.src = src;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Uploads audio blob to Supabase Storage and returns the public URL + path.
 */
async function uploadAudio(blob: Blob, userId: string): Promise<{ url: string; path: string }> {
  const fileName = `voice-complaint-${Date.now()}.webm`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('report-evidence')
    .upload(filePath, blob, { contentType: blob.type || 'audio/webm' });

  if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from('report-evidence').getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath };
}

/**
 * Builds a locally-derived analysis result when the AI edge function is
 * unavailable. Uses the reporter's selected category + text description to
 * produce a meaningful classification, severity rating, and confidence score
 * instead of a generic hardcoded fallback.
 */
function buildLocalAnalysis(context: {
  category: string;
  categoryGroup: string;
  description: string;
  title: string;
  lat: number;
  lng: number;
  city: string;
}): GeminiImageAnalysisResult {
  const cat = context.category || 'other';
  const group = context.categoryGroup || 'infrastructure';
  const title = context.title || '';
  const desc = context.description || '';

  // Severity heuristics based on category and keyword signals in the text
  const text = `${title} ${desc}`.toLowerCase();
  const criticalKeywords = ['critical', 'severe', 'danger', 'accident', 'fire', 'flood', 'collapse', 'urgent', 'immediate'];
  const highKeywords = ['major', 'large', 'deep', 'broken', 'damaged', 'blocked', 'heavy', 'serious'];
  const lowKeywords = ['minor', 'small', 'slight', 'minor', 'cosmetic', 'minor crack'];

  let severity: GeminiImageAnalysisResult['severity'] = 'medium';
  let priority = 55;
  let confidence = 0.72;

  if (criticalKeywords.some((k) => text.includes(k))) {
    severity = 'critical';
    priority = 90;
    confidence = 0.78;
  } else if (highKeywords.some((k) => text.includes(k))) {
    severity = 'high';
    priority = 72;
    confidence = 0.75;
  } else if (lowKeywords.some((k) => text.includes(k))) {
    severity = 'low';
    priority = 30;
    confidence = 0.7;
  } else {
    // Category-based default severity
    const criticalCats = ['wrong-side-driving', 'dangerous-driving', 'signal-jumping'];
    const highCats = ['pothole', 'road-crack', 'open-drain', 'traffic-signal-damage', 'illegal-construction', 'helmet-missing', 'triple-riding'];
    const lowCats = ['garbage', 'broken-streetlight'];
    if (criticalCats.includes(cat)) { severity = 'critical'; priority = 88; }
    else if (highCats.includes(cat)) { severity = 'high'; priority = 70; }
    else if (lowCats.includes(cat)) { severity = 'low'; priority = 35; }
  }

  const isTraffic = group === 'traffic';
  const imageCategory = isTraffic ? 'traffic-scene' : 'infrastructure-scene';
  const detectedViolation = isTraffic ? cat : null;
  const vehicleType = isTraffic ? null : null;

  const severityExplanation = severity === 'critical'
    ? 'High-risk issue flagged from the report description — requires immediate attention.'
    : severity === 'high'
      ? 'Significant issue identified from the report details — prompt action recommended.'
      : severity === 'low'
        ? 'Minor issue based on the report description — routine handling.'
        : 'Moderate issue identified from the report details.';

  const description = desc
    ? desc.slice(0, 200)
    : `${cat.replace(/-/g, ' ')} reported at ${context.city || 'the reported location'}.`;

  return {
    isRelevant: true,
    invalidImageType: null,
    imageCategory,
    vehicleType,
    vehicleNumber: null,
    issue: cat,
    detectedViolation,
    confidence,
    severity,
    severityExplanation,
    priority,
    description,
    reason: 'Image passed local validation. Classification derived from the report category and description (AI vision service was unavailable).',
    detectedObjects: [{ label: cat, confidence }],
    imageAuthenticity: {
      isGenuine: true,
      manipulationFlags: [],
      authenticityConfidence: 0.6,
    },
    evidenceQuality: 0.65,
    recommendedAction: `Route to the ${isTraffic ? 'traffic' : 'municipal'} department for inspection and follow-up.`,
    duplicateProbability: 0,
    duplicateOf: null,
  };
}

export const geminiService = {
  /**
   * Sends an image for visual analysis. Checks for selfies, portraits, and
   * category mismatches locally and via edge functions.
   */
  async analyzeImage(
    imageBase64: string,
    imageMimeType: string,
    context: {
      category: string;
      categoryGroup: string;
      description: string;
      title: string;
      lat: number;
      lng: number;
      city: string;
    },
  ): Promise<GeminiImageAnalysisResult> {
    // 1. Fast local pixel inspection for instant selfie / document rejection
    const localCheck = await analyzeImagePixelsLocally(imageBase64, imageMimeType, context.category);
    if (localCheck && !localCheck.isRelevant) {
      return localCheck;
    }

    // 2. Call backend Edge Function
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    let result: GeminiImageAnalysisResult | null = null;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/gemini-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          imageBase64,
          imageMimeType,
          ...context,
        }),
      });

      if (response.ok) {
        result = await response.json();
      } else {
        const body = await response.json().catch(() => ({ reason: `Image analysis failed (${response.status})` }));
        if (body.invalidImageType && typeof body.isRelevant === 'boolean') {
          return body as GeminiImageAnalysisResult;
        }
      }
    } catch {
      // Backend request failed or offline
    }

    // If backend returned result, enforce category & relevance check
    if (result) {
      // Check if image is relevant
      if (!result.isRelevant) {
        return result;
      }

      // If user selected pothole/road-crack, verify issue alignment
      const cat = (context.category || '').toLowerCase();
      if (cat.includes('pothole') || cat.includes('road')) {
        const detectedIssue = (result.issue || '').toLowerCase();
        const categoryDesc = (result.description || '').toLowerCase();
        const categoryType = (result.imageCategory || '').toLowerCase();

        if (
          categoryType === 'selfie' ||
          categoryType === 'portrait' ||
          categoryType === 'document' ||
          categoryType === 'animal'
        ) {
          return {
            ...result,
            isRelevant: false,
            invalidImageType: categoryType,
            reason: `This photo is a ${categoryType}, not a valid photo of a ${context.category || 'pothole'}.`,
          };
        }
      }

      return result;
    }

    // Fallback if AI backend unavailable and local check passed.
    // Derive a meaningful classification from the reporter's category +
    // text description so the result is accurate to the actual report
    // rather than a generic hardcoded "pothole" assessment.
    return buildLocalAnalysis(context);
  },

  /**
   * Saves a voice complaint record to the voice_complaints table.
   */
  async saveVoiceComplaint(
    audioBlob: Blob,
    complaintText: string,
    location: { lat: number; lng: number; address: string; city: string },
    evidenceUrls: string[],
    userId: string
  ): Promise<VoiceComplaintRecord> {
    const { url: audioUrl, path: audioPath } = await uploadAudio(audioBlob, userId);

    const { data, error } = await supabase
      .from('voice_complaints')
      .insert({
        reporter_id: userId,
        audio_path: audioPath,
        audio_url: audioUrl,
        detected_language: '',
        original_transcript: '',
        english_translation: complaintText,
        confidence: null,
        category: '',
        severity: 'medium',
        department: '',
        priority_score: 50,
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        city: location.city,
        evidence_urls: evidenceUrls,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save voice complaint: ${error.message}`);

    return {
      id: data.id,
      reporterId: data.reporter_id,
      audioPath: data.audio_path,
      audioUrl: data.audio_url,
      detectedLanguage: data.detected_language,
      originalTranscript: data.original_transcript,
      englishTranslation: data.english_translation,
      confidence: data.confidence,
      category: data.category,
      severity: data.severity,
      department: data.department,
      priorityScore: data.priority_score,
      lat: data.lat,
      lng: data.lng,
      address: data.address,
      city: data.city,
      evidenceUrls: data.evidence_urls,
      createdAt: data.created_at,
    };
  },
};
