import { supabase } from '@/services/supabaseClient';

/** Escapes special PostgREST filter characters in user input. */
function sanitizeFilterValue(input: string): string {
  return input.replace(/[\\%_(),.'"]/g, (ch) => '\\' + ch);
}

export interface AdminReport {
  id: string;
  incident_id: string;
  reporter_id: string | null;
  reporter_name: string;
  category: string;
  category_group: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  department: string;
  lat: number | null;
  lng: number | null;
  address: string;
  city: string;
  evidence_urls: string[];
  ai_result: any | null;
  vehicle_number: string | null;
  vehicle_type: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminReportStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  critical: number;
  todayCount: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  city: string;
  points: number;
  trust_score: number;
  level: string;
  reports_submitted: number;
  reports_verified: number;
  reports_rejected: number;
  flagged_fake: boolean;
  flagged_reason: string | null;
  flagged_at: string | null;
  banned: boolean;
  banned_at: string | null;
  created_at: string;
}

export interface AdminUserStats {
  totalUsers: number;
  flaggedCount: number;
  bannedCount: number;
  adminCount: number;
}

export const adminReportService = {
  async isAdmin(): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    return profile?.role === 'admin';
  },

  async getReports(filters?: {
    status?: string;
    severity?: string;
    categoryGroup?: string;
    search?: string;
  }): Promise<AdminReport[]> {
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.categoryGroup) query = query.eq('category_group', filters.categoryGroup);
    if (filters?.search) {
      const q = filters.search.trim();
      const safe = sanitizeFilterValue(q);
      query = query.or(`incident_id.ilike.%${safe}%,title.ilike.%${safe}%,reporter_name.ilike.%${safe}%,department.ilike.%${safe}%,address.ilike.%${safe}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AdminReport[];
  },

  async getReportStats(): Promise<AdminReportStats> {
    const { data, error } = await supabase.from('reports').select('status, severity, created_at');
    if (error) throw error;
    const reports = data ?? [];
    const today = new Date().toDateString();
    return {
      total: reports.length,
      pending: reports.filter((r: any) => r.status === 'pending' || r.status === 'ai-processing').length,
      verified: reports.filter((r: any) => r.status === 'verified').length,
      rejected: reports.filter((r: any) => r.status === 'rejected').length,
      assigned: reports.filter((r: any) => r.status === 'assigned').length,
      inProgress: reports.filter((r: any) => r.status === 'under_progress').length,
      resolved: reports.filter((r: any) => r.status === 'resolved').length,
      critical: reports.filter((r: any) => r.severity === 'critical').length,
      todayCount: reports.filter((r: any) => new Date(r.created_at).toDateString() === today).length,
    };
  },

  async updateReportStatus(id: string, status: string): Promise<void> {
    console.log('[adminReportService] updateReportStatus called with id:', id, 'new status:', status);

    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    if (status === 'under_progress') updates.resolved_at = null;

    // Fetch the report first to log both the UUID (id) and the display ID (incident_id)
    const { data: existing, error: fetchError } = await supabase
      .from('reports')
      .select('id, incident_id, status')
      .eq('id', id)
      .maybeSingle();

    console.log('[adminReportService] report.id (UUID):', existing?.id ?? 'NOT FOUND');
    console.log('[adminReportService] report.incident_id (display ID):', existing?.incident_id ?? 'N/A');
    console.log('[adminReportService] status before update:', existing?.status ?? 'N/A');
    if (fetchError) {
      console.error('[adminReportService] Failed to fetch report before update:', fetchError.code, fetchError.message);
    }

    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    await this.logAction('update_status', id, `Status changed to ${status}`);

    // Fetch the updated report to confirm the status was persisted
    const { data: updated, error: refetchError } = await supabase
      .from('reports')
      .select('id, incident_id, status')
      .eq('id', id)
      .maybeSingle();
    console.log('[adminReportService] fetched status after update:', updated?.status ?? 'N/A');
    if (refetchError) {
      console.error('[adminReportService] Failed to refetch report after update:', refetchError.code, refetchError.message);
    }
  },

  async deleteReport(id: string): Promise<void> {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
    await this.logAction('delete_report', id, 'Report deleted');
  },

  async updateReportSeverity(id: string, severity: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .update({ severity, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async assignDepartment(id: string, department: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('reports')
      .update({ department, status: 'assigned', assigned_at: now, assigned_by: adminId, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    // Record assignment history
    await supabase.from('report_assignments').insert({
      report_id: id, department, assigned_by: adminId, assigned_at: now,
    });
    await this.logAction('assign_department', id, `Assigned to ${department}`);
  },

  async getAssignmentHistory(reportId: string): Promise<Array<{ id: string; department: string; assigned_by: string | null; assigned_at: string; notes: string }>> {
    const { data, error } = await supabase
      .from('report_assignments')
      .select('*')
      .eq('report_id', reportId)
      .order('assigned_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  },

  async logAction(action: string, reportId: string, details: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('admin_logs').insert({
      admin_id: userData.user?.id ?? null, action, report_id: reportId, details,
    });
  },

  async notifyCitizen(reportId: string, reporterId: string | null, type: string, title: string, message: string): Promise<void> {
    if (!reporterId) return;
    await supabase.from('notifications').insert({
      user_id: reporterId, recipient_type: 'citizen', type, title, message, report_id: reportId,
    });
  },

  async setAdminNotes(id: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .update({ admin_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // ============ User management (fake-user handling) ============

  async getUsers(filters?: {
    search?: string;
    flaggedOnly?: boolean;
    bannedOnly?: boolean;
  }): Promise<AdminUserRow[]> {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (filters?.flaggedOnly) query = query.eq('flagged_fake', true);
    if (filters?.bannedOnly) query = query.eq('banned', true);
    if (filters?.search) {
      const q = filters.search.trim();
      const safe = sanitizeFilterValue(q);
      query = query.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%,city.ilike.%${safe}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AdminUserRow[];
  },

  async getUserStats(): Promise<AdminUserStats> {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, flagged_fake, banned');
    if (error) throw error;
    const users = data ?? [];
    return {
      totalUsers: users.length,
      flaggedCount: users.filter((u: any) => u.flagged_fake).length,
      bannedCount: users.filter((u: any) => u.banned).length,
      adminCount: users.filter((u: any) => u.role === 'admin').length,
    };
  },

  async flagUser(userId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        flagged_fake: true,
        flagged_reason: reason,
        flagged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
  },

  async unflagUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        flagged_fake: false,
        flagged_reason: '',
        flagged_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
  },

  async banUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        banned: true,
        banned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
  },

  async unbanUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        banned: false,
        banned_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
  },

  async getUserReports(userId: string): Promise<AdminReport[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AdminReport[];
  },
};
