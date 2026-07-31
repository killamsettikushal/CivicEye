import type {
  Report,
  ReportCategory,
  AIResult,
  Notification,
  ProcessingStep,
  ImageAuthenticity,
  LeaderboardEntry,
} from '@/types';
import { supabase } from '@/services/supabaseClient';
import { geminiService } from '@/services/geminiService';
import { arrayBufferToBase64 } from '@/utils/helpers';
import {
  getDepartmentForCategory,
  getCategoryGroup,
} from '@/data/mockData';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateIncidentId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CIVIC-2025-${num}`;
}

// ============ AI Processing Service ============

const PROCESSING_STEPS: { name: string; label: string }[] = [
  { name: 'upload', label: 'Uploading Evidence' },
  { name: 'quality', label: 'Image Quality Check' },
  { name: 'detection', label: 'Object Detection' },
  { name: 'ocr', label: 'OCR / Number Plate Reading' },
  { name: 'classification', label: 'Vehicle Classification' },
  { name: 'duplicate', label: 'Duplicate Detection' },
  { name: 'severity', label: 'Severity Analysis' },
  { name: 'routing', label: 'Department Assignment' },
  { name: 'report', label: 'Generating Report' },
];

export function getProcessingSteps(): ProcessingStep[] {
  return PROCESSING_STEPS.map((s) => ({ ...s, status: 'pending', progress: 0 }));
}

export async function processReport(
  reportId: string,
  category: ReportCategory,
  onStepProgress: (stepIndex: number, progress: number) => void,
  evidence?: { url: string; path?: string }[],
  context?: { title?: string; description?: string; lat?: number; lng?: number; city?: string },
): Promise<AIResult> {
  const hasImages = evidence && evidence.length > 0;

  if (!hasImages || !context) {
    throw new Error('Image evidence is required for AI analysis. Please upload a photo of the issue.');
  }

  for (let i = 0; i < 5; i++) {
    onStepProgress(i, 50);
  }

  const firstImage = evidence![0];
  console.log('[processReport] Fetching image for AI analysis:', firstImage.url);
  const imgResp = await fetch(firstImage.url);
  if (!imgResp.ok) {
    console.error('[processReport] Failed to fetch image from storage:', imgResp.status);
    throw new Error('Failed to load uploaded image for AI analysis. Please try again.');
  }
  const blob = await imgResp.blob();
  const mimeType = blob.type || 'image/jpeg';
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  console.log('[processReport] Image fetched:', { mimeType, size: blob.size, base64Length: base64.length });

  console.log('[processReport] Calling Gemini for image analysis...');
  const analysis = await geminiService.analyzeImage(base64, mimeType, {
    category,
    categoryGroup: getCategoryGroup(category),
    description: context.description ?? '',
    title: context.title ?? '',
    lat: context.lat ?? 0,
    lng: context.lng ?? 0,
    city: context.city ?? '',
  });
  console.log('[processReport] Gemini analysis result:', {
    isRelevant: analysis.isRelevant,
    severity: analysis.severity,
    confidence: analysis.confidence,
    issue: analysis.issue,
  });

  if (!analysis.isRelevant) {
    const invalidType = (analysis as any).invalidImageType ?? 'other';
    const reason = analysis.reason ?? 'This does not appear to be a valid traffic violation photo.';
    throw new Error(`INVALID_IMAGE:${invalidType}:${reason}`);
  }

  for (let i = 0; i < PROCESSING_STEPS.length; i++) {
    onStepProgress(i, 100);
  }

  const imageAuthenticity: ImageAuthenticity | undefined = analysis.imageAuthenticity
    ? {
        isGenuine: analysis.imageAuthenticity.isGenuine,
        manipulationFlags: analysis.imageAuthenticity.manipulationFlags ?? [],
        authenticityConfidence: analysis.imageAuthenticity.authenticityConfidence ?? 0,
      }
    : undefined;

  return {
    isRelevant: analysis.isRelevant,
    vehicleType: analysis.vehicleType ?? null,
    vehicleNumber: analysis.vehicleNumber ?? null,
    issue: analysis.issue ?? null,
    detectedViolation: analysis.detectedViolation ?? null,
    confidenceScore: analysis.confidence,
    severity: analysis.severity,
    severityExplanation: analysis.severityExplanation,
    priority: analysis.priority,
    description: analysis.description,
    reason: analysis.reason,
    detectedObjects: analysis.detectedObjects?.map((o: any) => ({
      label: o.label,
      confidence: o.confidence,
      bbox: o.bbox ?? { x: 0, y: 0, width: 0, height: 0 },
    })) ?? [],
    imageAuthenticity,
    evidenceQuality: analysis.evidenceQuality,
    recommendedAction: analysis.recommendedAction,
    incidentSummary: analysis.description,
    duplicateProbability: analysis.duplicateProbability,
    duplicateOf: analysis.duplicateOf ?? null,
    processingSteps: [],
  };
}

// ============ Report Service (Supabase only — no localStorage) ============

export const reportService = {
  async createReport(data: {
    category: ReportCategory;
    title: string;
    description: string;
    location: { lat: number; lng: number; address: string; city: string };
    evidenceUrls: string[];
  }): Promise<Report> {
    const { data: supaUser, error: authError } = await supabase.auth.getUser();
    if (authError || !supaUser.user) {
      console.error('[reportService.createReport] Auth error:', authError?.message);
      throw new Error('You must be signed in to submit a report.');
    }

    const reporterId = supaUser.user.id;
    const reporterName = supaUser.user.user_metadata?.full_name || supaUser.user.email?.split('@')[0] || 'Anonymous';
    const incidentId = generateIncidentId();
    const department = getDepartmentForCategory(data.category);
    const now = new Date().toISOString();

    console.log('[reportService.createReport] Inserting report to Supabase:', {
      incidentId,
      reporterId,
      category: data.category,
      title: data.title,
      evidenceCount: data.evidenceUrls.length,
    });

    const { data: insertedRow, error: insertError } = await supabase
      .from('reports')
      .insert({
        incident_id: incidentId,
        reporter_id: reporterId,
        reporter_name: reporterName,
        category: data.category,
        category_group: getCategoryGroup(data.category),
        title: data.title,
        description: data.description,
        status: 'pending',
        severity: 'medium',
        department,
        lat: data.location.lat,
        lng: data.location.lng,
        address: data.location.address,
        city: data.location.city,
        evidence_urls: data.evidenceUrls,
        created_at: now,
        updated_at: now,
      })
      .select('id, incident_id')
      .single();

    if (insertError) {
      console.error('[reportService.createReport] Supabase insert FAILED:', insertError.code, insertError.message, insertError.details);
      throw new Error(`Failed to save report to database: ${insertError.message}`);
    }

    console.log('[reportService.createReport] Report saved to Supabase with id:', insertedRow?.id, '| incident_id:', insertedRow?.incident_id);

    // Notify admins of the new report
    try {
      await supabase.from('notifications').insert({
        recipient_type: 'admin',
        type: 'new-report',
        title: 'New Report Submitted',
        message: `New ${data.category} report: ${data.title}`,
        report_id: insertedRow?.id,
      });
      console.log('[reportService.createReport] Admin notification inserted');
    } catch (notifErr) {
      console.warn('[reportService.createReport] Admin notification failed (non-critical):', notifErr);
    }

    const report: Report = {
      id: insertedRow?.id ?? `r${Date.now()}`,
      incidentId,
      category: data.category,
      categoryGroup: getCategoryGroup(data.category),
      title: data.title,
      description: data.description,
      status: 'pending',
      severity: 'medium',
      location: data.location,
      timestamp: now,
      reporterId,
      reporterName,
      department,
      evidenceUrls: data.evidenceUrls,
    };

    return report;
  },

  async updateReportWithAI(reportId: string, aiResult: AIResult): Promise<void> {
    console.log('[updateReportWithAI] Syncing AI result to Supabase for report:', reportId);

    const newStatus = aiResult.duplicateProbability > 0.6 ? 'rejected' : 'verified';
    const fraudScore = aiResult.duplicateProbability > 0.6 ? Math.round(aiResult.duplicateProbability * 100) : 0;

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: newStatus,
        severity: aiResult.severity,
        severity_explanation: aiResult.severityExplanation ?? null,
        ai_result: aiResult as any,
        vehicle_number: aiResult.vehicleNumber ?? null,
        vehicle_type: aiResult.vehicleType ?? null,
        fraud_score: fraudScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('[updateReportWithAI] Supabase update FAILED:', updateError.code, updateError.message);
      throw new Error(`Failed to save AI analysis to database: ${updateError.message}`);
    }

    console.log('[updateReportWithAI] AI result synced to Supabase | status:', newStatus, '| severity:', aiResult.severity, '| confidence:', aiResult.confidenceScore);
  },

  async getReports(filters?: {
    category?: ReportCategory;
    status?: string;
    department?: string;
    search?: string;
  }): Promise<Report[]> {
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.department) query = query.eq('department', filters.department);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      query = query.or(`incident_id.ilike.%${q}%,title.ilike.%${q}%,reporter_name.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[reportService.getReports] Query failed:', error.code, error.message);
      throw new Error(`Failed to load reports: ${error.message}`);
    }

    const reports: Report[] = (data ?? []).map((r: any) => ({
      id: r.id,
      incidentId: r.incident_id,
      category: r.category,
      categoryGroup: r.category_group,
      title: r.title,
      description: r.description,
      status: r.status,
      severity: r.severity,
      location: {
        lat: r.lat ?? 0,
        lng: r.lng ?? 0,
        address: r.address ?? '',
        city: r.city ?? '',
      },
      timestamp: r.created_at,
      reporterId: r.reporter_id,
      reporterName: r.reporter_name,
      department: r.department,
      evidenceUrls: r.evidence_urls ?? [],
      aiResult: r.ai_result ?? undefined,
      vehicleNumber: r.vehicle_number ?? undefined,
      vehicleType: r.vehicle_type ?? undefined,
    }));

    return reports;
  },

  async getReportById(id: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[reportService.getReportById] Query failed:', error.code, error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      incidentId: data.incident_id,
      category: data.category,
      categoryGroup: data.category_group,
      title: data.title,
      description: data.description,
      status: data.status,
      severity: data.severity,
      location: {
        lat: data.lat ?? 0,
        lng: data.lng ?? 0,
        address: data.address ?? '',
        city: data.city ?? '',
      },
      timestamp: data.created_at,
      reporterId: data.reporter_id,
      reporterName: data.reporter_name,
      department: data.department,
      evidenceUrls: data.evidence_urls ?? [],
      aiResult: data.ai_result ?? undefined,
      vehicleNumber: data.vehicle_number ?? undefined,
      vehicleType: data.vehicle_type ?? undefined,
    };
  },

  async updateReportStatus(id: string, status: Report['status']): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to update status: ${error.message}`);
  },

  async assignDepartment(id: string, department: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .update({ department, status: 'assigned', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to assign department: ${error.message}`);
  },

  async getDashboardStats(): Promise<{
    todayCount: number;
    pending: number;
    approved: number;
    rejected: number;
    critical: number;
    trafficCount: number;
    infrastructureCount: number;
  }> {
    const { data, error } = await supabase.from('reports').select('status, severity, category_group, created_at');
    if (error) throw new Error(`Failed to load stats: ${error.message}`);

    const reports = data ?? [];
    const today = new Date().toDateString();
    return {
      todayCount: reports.filter((r: any) => new Date(r.created_at).toDateString() === today).length,
      pending: reports.filter((r: any) => r.status === 'pending' || r.status === 'ai-processing').length,
      approved: reports.filter((r: any) => r.status === 'verified' || r.status === 'assigned' || r.status === 'under_progress' || r.status === 'resolved').length,
      rejected: reports.filter((r: any) => r.status === 'rejected').length,
      critical: reports.filter((r: any) => r.severity === 'critical').length,
      trafficCount: reports.filter((r: any) => r.category_group === 'traffic').length,
      infrastructureCount: reports.filter((r: any) => r.category_group === 'infrastructure').length,
    };
  },
};

// ============ Notification Service (Supabase only) ============

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userData.user.id},recipient_type.eq.admin`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[notificationService.getNotifications] Query failed:', error.code, error.message);
      return [];
    }

    return (data ?? []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      reportId: n.report_id ?? undefined,
      timestamp: n.created_at,
      read: n.read ?? false,
    }));
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.error('[notificationService.markAsRead] Failed:', error.message);
  },

  async markAllRead(): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .or(`user_id.eq.${userData.user.id},recipient_type.eq.admin`);
    if (error) console.error('[notificationService.markAllRead] Failed:', error.message);
  },
};

// ============ Gamification Service (Supabase only) ============

export const gamificationService = {
  async getBadges() {
    const { data, error } = await supabase.from('badges').select('*').order('threshold');
    if (error) return [];
    return data ?? [];
  },

  async getRewards() {
    const { data, error } = await supabase.from('rewards').select('*').order('points_required');
    if (error) return [];
    return data ?? [];
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, points, trust_score, level, reports_verified, city')
      .order('points', { ascending: false })
      .limit(20);
    if (error) return [];
    return (data ?? []).map((p: any, i: number) => ({
      rank: i + 1,
      userId: p.id,
      name: p.full_name ?? 'Anonymous',
      points: p.points ?? 0,
      level: p.level ?? 'Beginner',
      reportsVerified: p.reports_verified ?? 0,
      trustScore: p.trust_score ?? 0,
      city: p.city ?? '',
    }));
  },

  async getTrustHistory() {
    const { data, error } = await supabase
      .from('reward_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return data ?? [];
  },

  async getAnalytics() {
    const { data, error } = await supabase.from('reports').select('status, severity, category_group, created_at');
    if (error) return { totalReports: 0, resolvedReports: 0, pendingReports: 0 };
    return data ?? [];
  },
};

export { redemptionService } from '@/services/redemptionService';
