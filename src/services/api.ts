import type {
  Report,
  ReportCategory,
  AIResult,
  Notification,
  User,
  ProcessingStep,
  ImageAuthenticity,
} from '@/types';
import { supabase } from '@/services/supabaseClient';
import { geminiService } from '@/services/geminiService';
import { arrayBufferToBase64 } from '@/utils/helpers';
import {
  MOCK_REPORTS,
  MOCK_NOTIFICATIONS,
  MOCK_USERS,
  MOCK_BADGES,
  MOCK_REWARDS,
  MOCK_LEADERBOARD,
  MOCK_TRUST_HISTORY,
  MOCK_ANALYTICS,
  getDepartmentForCategory,
  getCategoryGroup,
  CATEGORY_LABELS,
} from '@/data/mockData';

// ============ Storage helpers (localStorage persistence) ============

const REPORTS_KEY = 'civiceye_reports';
const NOTIFS_KEY = 'civiceye_notifications';
const USER_KEY = 'civiceye_current_user';

function loadReports(): Report[] {
  try {
    const stored = localStorage.getItem(REPORTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  saveReports(MOCK_REPORTS);
  return MOCK_REPORTS;
}

function saveReports(reports: Report[]) {
  try { localStorage.setItem(REPORTS_KEY, JSON.stringify(reports)); } catch { /* ignore */ }
}

function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  saveNotifications(MOCK_NOTIFICATIONS);
  return MOCK_NOTIFICATIONS;
}

function saveNotifications(notifs: Notification[]) {
  try { localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs)); } catch { /* ignore */ }
}

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

  // Mark upload + quality steps as in progress
  for (let i = 0; i < 5; i++) {
    onStepProgress(i, 50);
  }

  const firstImage = evidence![0];
  const imgResp = await fetch(firstImage.url);
  const blob = await imgResp.blob();
  const mimeType = blob.type || 'image/jpeg';
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  const analysis = await geminiService.analyzeImage(base64, mimeType, {
    category,
    categoryGroup: getCategoryGroup(category),
    description: context.description ?? '',
    title: context.title ?? '',
    lat: context.lat ?? 0,
    lng: context.lng ?? 0,
    city: context.city ?? '',
  });

  // Strict validation gate: halt all downstream processing (OCR, plate
  // extraction, violation classification) when the image is not a genuine
  // traffic/civic scene. Surface the rejection to the user.
  if (!analysis.isRelevant) {
    const invalidType = (analysis as any).invalidImageType ?? 'other';
    const reason = analysis.reason ?? 'This does not appear to be a valid traffic violation photo.';
    throw new Error(`INVALID_IMAGE:${invalidType}:${reason}`);
  }

  // Complete all processing steps
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

// ============ Report Service ============

export const reportService = {
  async createReport(data: {
    category: ReportCategory;
    title: string;
    description: string;
    location: { lat: number; lng: number; address: string; city: string };
    evidenceUrls: string[];
  }): Promise<Report> {
    await delay(400);
    const reports = loadReports();
    const { data: supaUser } = await supabase.auth.getUser();
    const reporterId = supaUser.user?.id ?? 'u1';
    const reporterName = supaUser.user?.user_metadata?.full_name || supaUser.user?.email?.split('@')[0] || 'Demo User';
    const incidentId = generateIncidentId();
    const report: Report = {
      id: `r${Date.now()}`,
      incidentId,
      category: data.category,
      categoryGroup: getCategoryGroup(data.category),
      title: data.title,
      description: data.description,
      status: 'ai-processing',
      severity: 'medium',
      location: data.location,
      timestamp: new Date().toISOString(),
      reporterId,
      reporterName,
      department: getDepartmentForCategory(data.category),
      evidenceUrls: data.evidenceUrls,
    };
    reports.unshift(report);
    saveReports(reports);

    // Persist to Supabase so the admin portal can receive it in real time
    try {
      const { data: insertedRow, error: insertError } = await supabase
        .from('reports')
        .insert({
          incident_id: incidentId,
          reporter_id: supaUser.user?.id ?? null,
          reporter_name: reporterName,
          category: data.category,
          category_group: getCategoryGroup(data.category),
          title: data.title,
          description: data.description,
          status: 'ai-processing',
          severity: 'medium',
          department: getDepartmentForCategory(data.category),
          lat: data.location.lat,
          lng: data.location.lng,
          address: data.location.address,
          city: data.location.city,
          evidence_urls: data.evidenceUrls,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[reportService.createReport] Supabase insert failed:', insertError.code, insertError.message);
      } else {
        console.log('[reportService.createReport] Report persisted to Supabase with id:', insertedRow?.id);
      }
    } catch (err) {
      console.error('[reportService.createReport] Supabase insert threw:', err);
    }

    addNotification({
      type: 'report-submitted',
      title: 'Report Submitted',
      message: `Your report ${report.incidentId} has been submitted and is being processed.`,
      reportId: report.id,
    });

    // Notify admins of the new report
    try {
      await supabase.from('notifications').insert({
        recipient_type: 'admin',
        type: 'new-report',
        title: 'New Report Submitted',
        message: `New ${data.category} report: ${data.title}`,
        report_id: report.id,
      });
    } catch { /* non-critical */ }

    return report;
  },

  async updateReportWithAI(reportId: string, aiResult: AIResult): Promise<void> {
    const reports = loadReports();
    const idx = reports.findIndex((r) => r.id === reportId);
    if (idx >= 0) {
      reports[idx].aiResult = aiResult;
      reports[idx].status = aiResult.duplicateProbability > 0.6 ? 'rejected' : 'verified';
      reports[idx].severity = aiResult.severity;
      if (aiResult.vehicleNumber) reports[idx].vehicleNumber = aiResult.vehicleNumber;
      if (aiResult.vehicleType) reports[idx].vehicleType = aiResult.vehicleType;
      saveReports(reports);

      // Sync AI result + status to Supabase
      try {
        const newStatus = aiResult.duplicateProbability > 0.6 ? 'rejected' : 'verified';
        const { error: updateError } = await supabase
          .from('reports')
          .update({
            status: newStatus,
            severity: aiResult.severity,
            severity_explanation: aiResult.severityExplanation ?? null,
            ai_result: aiResult as any,
            vehicle_number: aiResult.vehicleNumber ?? null,
            vehicle_type: aiResult.vehicleType ?? null,
            fraud_score: aiResult.duplicateProbability > 0.6 ? Math.round(aiResult.duplicateProbability * 100) : 0,
            updated_at: new Date().toISOString(),
          })
          .eq('incident_id', reports[idx].incidentId);

        if (updateError) {
          console.error('[updateReportWithAI] Supabase update failed:', updateError.code, updateError.message);
        } else {
          console.log('[updateReportWithAI] AI result synced to Supabase for incident:', reports[idx].incidentId, '| status:', newStatus, '| severity:', aiResult.severity);
        }
      } catch (err) {
        console.error('[updateReportWithAI] Supabase update threw:', err);
      }

      addNotification({
        type: 'ai-completed',
        title: 'AI Analysis Complete',
        message: `Report ${reports[idx].incidentId} analysed. Severity: ${aiResult.severity}. Confidence: ${Math.round(aiResult.confidenceScore * 100)}%`,
        reportId: reportId,
      });
    }
  },

  async getReports(filters?: {
    category?: ReportCategory;
    status?: string;
    department?: string;
    search?: string;
  }): Promise<Report[]> {
    await delay(300);
    let reports = loadReports();
    if (filters?.category) reports = reports.filter((r) => r.category === filters.category);
    if (filters?.status) reports = reports.filter((r) => r.status === filters.status);
    if (filters?.department) reports = reports.filter((r) => r.department === filters.department);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.incidentId.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.location.address.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          (r.vehicleNumber ?? '').toLowerCase().includes(q),
      );
    }
    return reports;
  },

  async getReportById(id: string): Promise<Report | null> {
    await delay(200);
    const reports = loadReports();
    return reports.find((r) => r.id === id) ?? null;
  },

  async updateReportStatus(id: string, status: Report['status']): Promise<void> {
    const reports = loadReports();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx >= 0) {
      reports[idx].status = status;
      saveReports(reports);
    }
  },

  async assignDepartment(id: string, department: string): Promise<void> {
    const reports = loadReports();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx >= 0) {
      reports[idx].department = department;
      reports[idx].status = 'assigned';
      saveReports(reports);
    }
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
    await delay(300);
    const reports = loadReports();
    const today = new Date().toDateString();
    return {
      todayCount: reports.filter((r) => new Date(r.timestamp).toDateString() === today).length,
      pending: reports.filter((r) => r.status === 'pending' || r.status === 'ai-processing').length,
      approved: reports.filter((r) => r.status === 'verified' || r.status === 'assigned' || r.status === 'under_progress' || r.status === 'resolved').length,
      rejected: reports.filter((r) => r.status === 'rejected').length,
      critical: reports.filter((r) => r.severity === 'critical').length,
      trafficCount: reports.filter((r) => r.categoryGroup === 'traffic').length,
      infrastructureCount: reports.filter((r) => r.categoryGroup === 'infrastructure').length,
    };
  },
};

// ============ Notification Service ============

function addNotification(data: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  const notifs = loadNotifications();
  notifs.unshift({
    ...data,
    id: `n${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  });
  saveNotifications(notifs);
}

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    await delay(200);
    return loadNotifications();
  },

  async markAsRead(id: string): Promise<void> {
    const notifs = loadNotifications();
    const idx = notifs.findIndex((n) => n.id === id);
    if (idx >= 0) { notifs[idx].read = true; saveNotifications(notifs); }
  },

  async markAllRead(): Promise<void> {
    const notifs = loadNotifications();
    notifs.forEach((n) => (n.read = true));
    saveNotifications(notifs);
  },
};

// ============ Gamification Service ============

export const gamificationService = {
  async getBadges() { await delay(200); return MOCK_BADGES; },
  async getRewards() { await delay(200); return MOCK_REWARDS; },
  async getLeaderboard() { await delay(300); return MOCK_LEADERBOARD; },
  async getTrustHistory() { await delay(200); return MOCK_TRUST_HISTORY; },
  async getAnalytics() { await delay(400); return MOCK_ANALYTICS; },
};

export { redemptionService } from '@/services/redemptionService';
