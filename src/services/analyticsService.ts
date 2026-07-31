import { supabase } from '@/services/supabaseClient';

export interface RealAnalyticsData {
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
  monthlyTrend: { month: string; count: number; infrastructure: number; traffic: number }[];
  avgResolutionDays: number | null;
  topCities: { city: string; count: number }[];
}

export interface AIInsights {
  summary: string;
  keyFindings: string[];
  areasNeedingAttention: string[];
  notableImprovements: string[];
  recommendations: string[];
}

export const analyticsService = {
  async getRealAnalytics(): Promise<RealAnalyticsData> {
    // Total + status breakdown in one query
    const { data: statusData, error: statusErr } = await supabase
      .from('reports')
      .select('status, category, category_group, severity, city, department, lat, lng, address, created_at, resolved_at, reporter_id');

    if (statusErr) throw new Error(`Failed to fetch reports: ${statusErr.message}`);

    const reports = statusData ?? [];

    // Profile counts
    const { count: totalCitizens, error: citizenErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (citizenErr) console.error('[analytics] Failed to count citizens:', citizenErr.message);

    const activeCitizenIds = new Set(reports.map((r) => r.reporter_id ?? '').filter(Boolean));

    const statusCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const deptResolved: Record<string, number> = {};
    const deptPending: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const locationCounts: Record<string, { count: number; lat: number | null; lng: number | null }> = {};
    const monthCounts: Record<string, number> = {};

    let resolvedCount = 0;
    let resolvedTimeSum = 0;

    const monthInfra: Record<string, number> = {};
    const monthTraffic: Record<string, number> = {};

    for (const r of reports) {
      // Status
      const status = r.status ?? 'unknown';
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;

      // Category
      const cat = r.category ?? 'unknown';
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;

      // Severity
      const sev = r.severity ?? 'medium';
      severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;

      // Department performance
      const dept = r.department ?? 'Unassigned';
      if (status === 'resolved') {
        deptResolved[dept] = (deptResolved[dept] ?? 0) + 1;
        resolvedCount++;
        if (r.resolved_at && r.created_at) {
          const days = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 86400000;
          if (days >= 0 && days < 365) resolvedTimeSum += days;
        }
      } else if (status !== 'rejected') {
        deptPending[dept] = (deptPending[dept] ?? 0) + 1;
      }

      // City
      const city = r.city ?? 'Unknown';
      cityCounts[city] = (cityCounts[city] ?? 0) + 1;

      // Location (use address or city as the area label)
      const area = r.address || r.city || 'Unknown location';
      const existing = locationCounts[area];
      if (existing) {
        existing.count++;
      } else {
        locationCounts[area] = { count: 1, lat: r.lat, lng: r.lng };
      }

      // Monthly trend with category group split
      if (r.created_at) {
        const month = r.created_at.slice(0, 7);
        monthCounts[month] = (monthCounts[month] ?? 0) + 1;
        if (r.category_group === 'traffic') {
          monthTraffic[month] = (monthTraffic[month] ?? 0) + 1;
        } else {
          monthInfra[month] = (monthInfra[month] ?? 0) + 1;
        }
      }
    }

    const statusBreakdown = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const severityBreakdown = Object.entries(severityCounts)
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => b.count - a.count);

    const allDepts = new Set<string>([...Object.keys(deptResolved), ...Object.keys(deptPending)]);
    const departmentPerformance = Array.from(allDepts)
      .map((dept) => ({
        department: dept,
        resolved: deptResolved[dept] ?? 0,
        pending: deptPending[dept] ?? 0,
      }))
      .sort((a, b) => (b.resolved + b.pending) - (a.resolved + a.pending));

    const topCities = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topLocations = Object.entries(locationCounts)
      .map(([area, info]) => ({ area, count: info.count, lat: info.lat, lng: info.lng }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const monthlyTrend = Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count, infrastructure: monthInfra[month] ?? 0, traffic: monthTraffic[month] ?? 0 }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    const avgResolutionDays = resolvedCount > 0 ? resolvedTimeSum / resolvedCount : null;

    return {
      totalReports: reports.length,
      resolvedReports: statusCounts['resolved'] ?? 0,
      pendingReports: (statusCounts['verified'] ?? 0) + (statusCounts['under-progress'] ?? 0) + (statusCounts['in-progress'] ?? 0) + (statusCounts['ai-processing'] ?? 0),
      rejectedReports: statusCounts['rejected'] ?? 0,
      verifiedReports: statusCounts['verified'] ?? 0,
      inProgressReports: (statusCounts['under-progress'] ?? 0) + (statusCounts['in-progress'] ?? 0),
      totalCitizens: totalCitizens ?? 0,
      activeCitizens: activeCitizenIds.size,
      categoryBreakdown,
      severityBreakdown,
      statusBreakdown,
      topLocations,
      departmentPerformance,
      monthlyTrend,
      avgResolutionDays,
      topCities,
    };
  },

  async generateAIInsights(data: RealAnalyticsData): Promise<AIInsights> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/gemini-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
      throw new Error(body.error || `AI insights failed (${response.status})`);
    }

    const insights = await response.json();

    if (!insights || typeof insights.summary !== 'string') {
      throw new Error('The AI returned an unexpected response format.');
    }

    return insights as AIInsights;
  },
};
