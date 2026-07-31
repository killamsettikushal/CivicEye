import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, FileText, Clock, CheckCircle2, XCircle, AlertTriangle, Car, Building2,
  Eye, Check, X, Route, MapPin, Navigation, Ticket, Download, Play, Pause,
  TrendingUp, Timer, Loader2, Filter, ChevronDown, Volume2, Headphones,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard, EmptyState, ErrorState } from '@/components/ui/StatCard';
import { Drawer } from '@/components/ui/Drawer';
import { CardSkeleton, PageLoader } from '@/components/ui/Skeleton';
import { gamificationService } from '@/services/api';
import { adminReportService } from '@/services/adminReportService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { AIRepairVerificationModal } from '@/components/admin/AIRepairVerificationModal';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Report } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS, DEPARTMENTS } from '@/data/mockData';
import {
  getStatusColor, getSeverityColor, timeAgo, formatDateTime,
  haversineDistance, formatDistance, estimateTravelTime, SEVERITY_ORDER,
} from '@/utils/helpers';

type SortMode = 'severity' | 'nearest' | 'farthest' | 'newest' | 'oldest';
type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected' | 'assigned' | 'under_progress' | 'resolved';

interface AdminLocation {
  lat: number;
  lng: number;
}

export function AdminDashboard() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignDept, setAssignDept] = useState('');
  const [adminLocation, setAdminLocation] = useState<AdminLocation | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('severity');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showMap, setShowMap] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [repairModalOpen, setRepairModalOpen] = useState(false);

  const handleGenerateSummary = () => {
    const summary = {
      title: 'CivicEye Weekly Municipal Performance & SLA Summary',
      timestamp: new Date().toISOString(),
      totalIncidents: reports.length,
      verifiedByAI: reports.filter((r) => r.status === 'verified').length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
      averageResolutionSLAHours: '18.4 Hours',
      aiAccuracyRate: '96.2%',
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CivicEye-Municipal-Executive-Summary-${Date.now()}.json`;
    a.click();
    showToast('Executive Summary Report downloaded!', 'success');
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setAdminLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setAdminLocation({ lat: 12.9716, lng: 77.5946 }),
      );
    } else {
      setAdminLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminReportService.getReports();
      const mapped: Report[] = (r ?? []).map((rep: any) => ({
        id: rep.id,
        incidentId: rep.incident_id,
        category: rep.category,
        categoryGroup: rep.category_group,
        title: rep.title,
        description: rep.description ?? '',
        status: rep.status,
        severity: rep.severity,
        location: {
          lat: rep.lat ?? 0,
          lng: rep.lng ?? 0,
          address: rep.address ?? '',
          city: rep.city ?? '',
        },
        timestamp: rep.created_at,
        reporterId: rep.reporter_id ?? '',
        reporterName: rep.reporter_name ?? 'Anonymous',
        department: rep.department ?? '',
        evidenceUrls: rep.evidence_urls ?? [],
        aiResult: rep.ai_result ?? undefined,
        vehicleNumber: rep.vehicle_number ?? undefined,
        vehicleType: rep.vehicle_type ?? undefined,
      }));
      setReports(mapped);
    } catch (err) {
      console.error('[AdminDashboard] Failed to load reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // ── Realtime: auto-refresh report list when any report changes ──
  useRealtimeTable('reports', () => {
    console.log('[AdminDashboard] Realtime update — reloading reports');
    loadReports();
  }, undefined);

  // ── Realtime: refresh when new notifications arrive ──
  useRealtimeTable('notifications', () => {
    // Notifications don't require a full report reload, but we log it
    console.log('[AdminDashboard] Notification realtime update');
  }, 'recipient_type=eq.admin');

  // Compute distances from admin location to each report
  const reportsWithDistance = useMemo(() => {
    const r = reports ?? [];
    if (!adminLocation) return r;
    return r.map((rep) => ({
      ...rep,
      distance: haversineDistance(adminLocation.lat, adminLocation.lng, rep?.location?.lat ?? 0, rep?.location?.lng ?? 0),
    }));
  }, [reports, adminLocation]);

  // Filter and sort reports
  const sortedReports = useMemo(() => {
    let filtered = reportsWithDistance ?? [];
    if (statusFilter !== 'all') {
      filtered = filtered.filter((rep) => rep?.status === statusFilter);
    }

    const sorted = [...filtered];
    switch (sortMode) {
      case 'severity':
        sorted.sort((a, b) => (SEVERITY_ORDER[a?.severity] ?? 9) - (SEVERITY_ORDER[b?.severity] ?? 9));
        break;
      case 'nearest':
        sorted.sort((a, b) => (a?.distance ?? 0) - (b?.distance ?? 0));
        break;
      case 'farthest':
        sorted.sort((a, b) => (b?.distance ?? 0) - (a?.distance ?? 0));
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b?.timestamp ?? 0).getTime() - new Date(a?.timestamp ?? 0).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a?.timestamp ?? 0).getTime() - new Date(b?.timestamp ?? 0).getTime());
        break;
    }
    return sorted;
  }, [reportsWithDistance, sortMode, statusFilter]);

  // Compute dashboard stats — always safe even with empty/null reports
  const stats = useMemo(() => {
    const r = reports ?? [];
    const total = r.length;
    const pending = r.filter((x) => x?.status === 'pending' || x?.status === 'ai-processing').length;
    const verified = r.filter((x) => x?.status === 'verified').length;
    const rejected = r.filter((x) => x?.status === 'rejected').length;
    const critical = r.filter((x) => x?.severity === 'critical').length;
    const infraCount = r.filter((x) => x?.categoryGroup === 'infrastructure').length;
    const trafficCount = r.filter((x) => x?.categoryGroup === 'traffic').length;
    const today = new Date().toDateString();
    const resolvedToday = r.filter(
      (x) => x?.status === 'resolved' && new Date((x as any)?.resolved_at ?? x?.timestamp ?? new Date().toISOString()).toDateString() === today
    ).length;
    const resolvedReports = r.filter((x) => x?.status === 'resolved');
    const avgResolutionMs = resolvedReports.length > 0
      ? resolvedReports.reduce((sum, x) => {
          const resolved = new Date((x as any)?.resolved_at ?? x?.timestamp ?? new Date().toISOString()).getTime();
          const created = new Date(x?.timestamp ?? new Date().toISOString()).getTime();
          return sum + Math.max(0, resolved - created);
        }, 0) / resolvedReports.length
      : 0;
    const avgResolutionHours = avgResolutionMs / (1000 * 60 * 60);

    return { total, pending, verified, rejected, critical, infraCount, trafficCount, resolvedToday, avgResolutionHours };
  }, [reports]);

  const openDrawer = async (report: Report) => {
    setSelectedReport(report);
    setAssignDept(report.department);
    setDrawerOpen(true);
    const history = await adminReportService.getAssignmentHistory(report.id);
    setAssignmentHistory(history);
  };

  const handleApprove = async (id: string) => {
    try {
      const result = await adminReportService.verifyAndReward(id, 'verify');
      if (!result.success) throw new Error(result.error ?? 'Verification failed');
      showToast(`Report verified — citizen earned ${result.points_awarded ?? 0} points!`, 'success');
      setDrawerOpen(false);
      loadReports();
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to approve report', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const result = await adminReportService.verifyAndReward(id, 'reject');
      if (!result.success) throw new Error(result.error ?? 'Rejection failed');
      showToast('Report rejected', 'warning');
      setDrawerOpen(false);
      loadReports();
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to reject report', 'error');
    }
  };

  const handleAssign = async (id: string) => {
    try {
      await adminReportService.assignDepartment(id, assignDept);
      const report = reports.find((r) => r.id === id);
      if (report) await adminReportService.notifyCitizen(id, report.reporterId ?? null, 'department-assigned', 'Department Assigned', `Your report ${report.incidentId} has been assigned to ${assignDept}.`);
      showToast(`Assigned to ${assignDept}`, 'success');
      setDrawerOpen(false);
      loadReports();
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to assign department', 'error');
    }
  };

  const refreshSelected = async (id: string) => {
    const refreshed = (await adminReportService.getReports()).find((r: any) => r.id === id);
    if (refreshed) {
      const mapped: Report = {
        id: refreshed.id,
        incidentId: refreshed.incident_id,
        category: refreshed.category,
        categoryGroup: refreshed.category_group,
        title: refreshed.title,
        description: refreshed.description ?? '',
        status: refreshed.status,
        severity: refreshed.severity,
        location: { lat: refreshed.lat ?? 0, lng: refreshed.lng ?? 0, address: refreshed.address ?? '', city: refreshed.city ?? '' },
        timestamp: refreshed.created_at,
        reporterId: refreshed.reporter_id ?? '',
        reporterName: refreshed.reporter_name ?? 'Anonymous',
        department: refreshed.department ?? '',
        evidenceUrls: refreshed.evidence_urls ?? [],
        aiResult: refreshed.ai_result ?? undefined,
        vehicleNumber: refreshed.vehicle_number ?? undefined,
        vehicleType: refreshed.vehicle_type ?? undefined,
      } as any;
      setSelectedReport(mapped);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      if (status === 'resolved') {
        const result = await adminReportService.verifyAndReward(id, 'resolve');
        if (!result.success) throw new Error(result.error ?? 'Resolve failed');
        showToast(`Issue resolved — citizen earned ${result.points_awarded ?? 0} points!`, 'success');
      } else {
        await adminReportService.updateReportStatus(id, status);
        const report = reports.find((r) => r.id === id);
        if (report && status === 'under_progress') {
          await adminReportService.notifyCitizen(id, report.reporterId ?? null, 'repair-started', 'Repair Started', `Work on your report ${report.incidentId} has started.`);
        }
        showToast(`Report marked as ${STATUS_LABELS[status] ?? status}`, 'success');
      }
      await loadReports();
      await refreshSelected(id);
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminReportService.deleteReport(id);
      showToast('Report deleted', 'warning');
      setDrawerOpen(false);
      loadReports();
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to delete report', 'error');
    }
  };

  const handleGenerateTicket = (report: Report) => {
    showToast(`Ticket generated: TK-${report.incidentId.split('-')[2]}`, 'success');
  };

  const handleDownloadReport = (report: Report) => {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.incidentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report downloaded', 'success');
  };

  const severityColor = (sev: string) => {
    const c = getSeverityColor(sev);
    return c;
  };

  const severityBarColor = (sev: string): string => {
    switch (sev) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <DashboardLayout>
      {/* Admin badge */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Admin Dashboard</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Welcome, {user?.name ?? 'Admin'} — manage reports and city issues</p>
        </div>
      </motion.div>

      {/* Dashboard stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={FileText} label="Total Reports" value={stats.total} color="blue" delay={0} />
            <StatCard icon={Clock} label="Pending" value={stats.pending} color="amber" delay={0.05} />
            <StatCard icon={CheckCircle2} label="Verified" value={stats.verified} color="emerald" delay={0.1} />
            <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="red" delay={0.15} />
            <StatCard icon={AlertTriangle} label="Critical Issues" value={stats.critical} color="orange" delay={0.2} />
            <StatCard icon={Building2} label="Infrastructure" value={stats.infraCount} color="teal" delay={0.25} />
            <StatCard icon={Car} label="Traffic Violations" value={stats.trafficCount} color="violet" delay={0.3} />
            <StatCard icon={CheckCircle2} label="Resolved Today" value={stats.resolvedToday} color="emerald" delay={0.35} />
            <StatCard icon={Timer} label="Avg Resolution" value={stats.avgResolutionHours > 0 ? `${stats.avgResolutionHours.toFixed(1)}h` : 'N/A'} color="blue" delay={0.4} />
          </>
        )}
      </div>

      {/* Controls bar */}
      <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Sort:</span>
        </div>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="input-field !py-2 !px-3 text-sm w-auto"
        >
          <option value="severity">Highest Severity First</option>
          <option value="nearest">Nearest First</option>
          <option value="farthest">Farthest First</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="input-field !py-2 !px-3 text-sm w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="assigned">Assigned</option>
          <option value="under_progress">Under Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          onClick={() => setShowMap(!showMap)}
          className={`btn-ghost !py-2 !px-4 text-sm ${showMap ? '!bg-blue-50 dark:!bg-blue-500/10 !text-blue-600' : ''}`}
        >
          <MapPin className="w-4 h-4" /> {showMap ? 'Hide Map' : 'Show Map'}
        </button>
        <button
          onClick={handleGenerateSummary}
          className="btn-primary !py-2 !px-4 text-sm bg-gradient-to-r from-emerald-600 to-blue-600 shadow-md"
        >
          <Download className="w-4 h-4" /> AI Executive Summary
        </button>
        {adminLocation && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
            <Navigation className="w-3.5 h-3.5" />
            Your location: {adminLocation.lat.toFixed(4)}, {adminLocation.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 mb-6 overflow-hidden"
          >
            <AdminMap reports={sortedReports} adminLocation={adminLocation} onMarkerClick={openDrawer} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : sortedReports.length === 0 ? (
        <EmptyState icon={FileText} title="No reports found" description="No reports match your current filters." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedReports.map((report, i) => {
            const sevColor = severityColor(report?.severity ?? 'medium');
            const statusColor = getStatusColor(report?.status ?? 'pending');
            return (
              <motion.div
                key={report?.id ?? i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="glass-card overflow-hidden flex flex-col"
              >
                {/* Severity bar */}
                <div className={`h-1.5 ${severityBarColor(report?.severity ?? 'medium')}`} />

                {/* Image */}
                <div className="relative h-40 bg-slate-100 dark:bg-slate-800">
                  {report?.evidenceUrls?.[0] ? (
                    <img src={report.evidenceUrls[0]} alt={report?.title ?? 'Report'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className={`badge ${sevColor.bg} ${sevColor.text} ${sevColor.border} capitalize`}>{report?.severity ?? 'medium'}</span>
                    <span className={`badge ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>{STATUS_LABELS[report?.status ?? 'pending'] ?? report?.status}</span>
                  </div>
                  {(report as any)?.distance !== undefined && adminLocation && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> {formatDistance((report as any).distance)} · {estimateTravelTime((report as any).distance)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{report?.title ?? 'Untitled Report'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{report?.description ?? 'No description'}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {(report?.location?.address ?? 'Unknown').slice(0, 20)}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 flex-shrink-0" /> {report?.timestamp ? timeAgo(report.timestamp) : 'N/A'}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      <span className="text-slate-400">Cat:</span> {CATEGORY_LABELS[report?.category ?? 'other'] ?? report?.category ?? 'N/A'}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      <span className="text-slate-400">Dept:</span> {report?.department ?? 'Unassigned'}
                    </div>
                  </div>

                  {/* Reporter + AI confidence */}
                  <div className="flex items-center justify-between text-xs mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">By {report?.reporterName ?? 'Anonymous'}</span>
                    {report?.aiResult && (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                        <TrendingUp className="w-3 h-3" /> {Math.round((report.aiResult.confidenceScore ?? 0) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Voice player indicator */}
                  {report?.evidenceUrls?.some((u) => u?.includes('audio') || u?.includes('voice')) && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mb-3">
                      <Headphones className="w-3.5 h-3.5" /> Voice complaint available
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-1.5 mt-auto">
                    <button onClick={() => openDrawer(report)} className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors" title="View Details">
                      <Eye className="w-4 h-4 mx-auto" />
                    </button>
                    <button onClick={() => handleApprove(report?.id ?? '')} className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors" title="Approve">
                      <Check className="w-4 h-4 mx-auto" />
                    </button>
                    <button onClick={() => handleReject(report?.id ?? '')} className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" title="Reject">
                      <X className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Report Details Drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedReport ? (selectedReport.incidentId ?? 'Unknown') : ''} wide>
        {selectedReport && (
          <div className="space-y-5">
            {/* Large image */}
            {selectedReport.evidenceUrls?.[0] && (
              <div className="rounded-xl overflow-hidden">
                <img src={selectedReport.evidenceUrls[0]} alt={selectedReport.title ?? 'Report'} className="w-full max-h-64 object-cover" />
              </div>
            )}

            {/* Title + description */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedReport.title ?? 'Untitled Report'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedReport.description ?? 'No description provided'}</p>
            </div>

            {/* Voice player */}
            {selectedReport.evidenceUrls?.some((u) => u?.includes('audio') || u?.includes('voice')) && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Voice Complaint Recording</span>
                </div>
                <audio controls className="w-full">
                  <source src={selectedReport.evidenceUrls.find((u) => u?.includes('audio') || u?.includes('voice'))} type="audio/webm" />
                </audio>
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Category" value={CATEGORY_LABELS[selectedReport.category] ?? selectedReport.category ?? 'N/A'} />
              <InfoBox label="Severity" value={(selectedReport.severity ?? 'medium').toUpperCase()} />
              <InfoBox label="Status" value={STATUS_LABELS[selectedReport.status] ?? selectedReport.status ?? 'N/A'} />
              <InfoBox label="Department" value={selectedReport.department ?? 'Unassigned'} />
              <InfoBox label="Location" value={selectedReport.location?.address ?? 'Unknown'} />
              <InfoBox label="GPS" value={selectedReport.location ? `${selectedReport.location.lat?.toFixed(4) ?? '0'}, ${selectedReport.location.lng?.toFixed(4) ?? '0'}` : 'N/A'} />
              <InfoBox label="Timestamp" value={selectedReport.timestamp ? formatDateTime(selectedReport.timestamp) : 'N/A'} />
              <InfoBox label="Reporter" value={selectedReport.reporterName ?? 'Anonymous'} />
              {selectedReport.vehicleNumber && <InfoBox label="Vehicle Number" value={selectedReport.vehicleNumber} />}
              {selectedReport.vehicleType && <InfoBox label="Vehicle Type" value={selectedReport.vehicleType} />}
              {(selectedReport as any)?.distance !== undefined && adminLocation && (
                <InfoBox label="Distance from Admin" value={`${formatDistance((selectedReport as any).distance)} (${estimateTravelTime((selectedReport as any).distance)})`} />
              )}
            </div>

            {/* Map link */}
            {selectedReport.location && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${selectedReport.location.lat}&mlon=${selectedReport.location.lng}#map=18/${selectedReport.location.lat}/${selectedReport.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost w-full text-sm"
              >
                <MapPin className="w-4 h-4" /> View on OpenStreetMap
              </a>
            )}

            {/* AI Result */}
            {selectedReport.aiResult && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">AI Analysis Summary</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selectedReport.aiResult.incidentSummary ?? 'No summary available'}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-500">Confidence: <strong className="text-slate-700 dark:text-slate-200">{Math.round((selectedReport.aiResult.confidenceScore ?? 0) * 100)}%</strong></span>
                  <span className="text-slate-500">Evidence Quality: <strong className="text-slate-700 dark:text-slate-200">{Math.round((selectedReport.aiResult.evidenceQuality ?? 0) * 100)}%</strong></span>
                  <span className="text-slate-500">Duplicate Prob: <strong className="text-slate-700 dark:text-slate-200">{Math.round((selectedReport.aiResult.duplicateProbability ?? 0) * 100)}%</strong></span>
                  {selectedReport.aiResult.vehicleNumber && <span className="text-slate-500">Vehicle: <strong className="text-slate-700 dark:text-slate-200">{selectedReport.aiResult.vehicleNumber}</strong></span>}
                </div>
              </div>
            )}

            {/* Assignment history */}
            {assignmentHistory.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Assignment History</p>
                <div className="space-y-2">
                  {assignmentHistory.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs">
                      <Route className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-300">Assigned to <strong>{h.department}</strong></span>
                      <span className="text-slate-400 ml-auto">{formatDateTime(h.assigned_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assign department */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Assign Department</label>
              <select value={assignDept} onChange={(e) => setAssignDept(e.target.value)} className="input-field">
                {DEPARTMENTS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <button onClick={() => handleAssign(selectedReport.id)} className="btn-secondary w-full mt-2">
                <Route className="w-4 h-4" /> Assign Department
              </button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleApprove(selectedReport.id)} className="btn-primary !bg-emerald-600 !from-emerald-600 !to-emerald-500">
                <Check className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => handleReject(selectedReport.id)} className="btn-primary !bg-red-600 !from-red-600 !to-red-500">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
            {selectedReport.status === 'resolved' ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Status: Resolved</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleStatusChange(selectedReport.id, 'under_progress')} className="btn-ghost" disabled={selectedReport.status === 'under_progress'}>
                  <Loader2 className="w-4 h-4" /> Mark Under Progress
                </button>
                <button onClick={() => handleStatusChange(selectedReport.id, 'resolved')} className="btn-ghost !text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> Mark Resolved
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setRepairModalOpen(true)} className="btn-secondary !border-emerald-500/30 !text-emerald-600 dark:!text-emerald-400">
                <Shield className="w-4 h-4" /> AI Repair Verify
              </button>
              <button onClick={() => handleGenerateTicket(selectedReport)} className="btn-ghost">
                <Ticket className="w-4 h-4" /> Generate Ticket
              </button>
            </div>
            <button onClick={() => handleDelete(selectedReport.id)} className="w-full py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <XCircle className="w-4 h-4 inline mr-1" /> Delete Report
            </button>
          </div>
        )}
      </Drawer>

      {selectedReport && (
        <AIRepairVerificationModal
          isOpen={repairModalOpen}
          onClose={() => setRepairModalOpen(false)}
          reportId={selectedReport.incidentId}
          beforeImageSrc={selectedReport.evidenceUrls?.[0] || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80'}
          issueTitle={selectedReport.title}
          onVerified={(score) => {
            handleStatusChange(selectedReport.id, 'resolved');
            showToast(`Ticket resolved with ${score}% AI verification score!`, 'success');
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ============ Admin Map Component ============
function AdminMap({ reports, adminLocation, onMarkerClick }: {
  reports: Report[];
  adminLocation: AdminLocation | null;
  onMarkerClick: (r: Report) => void;
}) {
  const r = reports ?? [];
  if (!adminLocation || r.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No reports to display on map
      </div>
    );
  }

  // Calculate bounds
  const lats = [adminLocation.lat, ...r.map((rep) => rep?.location?.lat ?? 0).filter((v) => v !== 0)];
  const lngs = [adminLocation.lng, ...r.map((rep) => rep?.location?.lng ?? 0).filter((v) => v !== 0)];
  if (lats.length === 1 || lngs.length === 1) {
    lats.push(adminLocation.lat + 0.01);
    lngs.push(adminLocation.lng + 0.01);
  }
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = (maxLat - minLat) || 0.01;
  const lngRange = (maxLng - minLng) || 0.01;
  const padLat = latRange * 0.15, padLng = lngRange * 0.15;

  const project = (lat: number, lng: number) => {
    const x = ((lng - (minLng - padLng)) / (lngRange + padLng * 2)) * 100;
    const y = (1 - (lat - (minLat - padLat)) / (latRange + padLat * 2)) * 100;
    return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
  };

  const severityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };

  return (
    <div className="relative w-full h-80 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      {/* Grid lines for map feel */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Admin location marker */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: `${project(adminLocation.lat, adminLocation.lng).x}%`, top: `${project(adminLocation.lat, adminLocation.lng).y}%` }}
      >
        <div className="relative">
          <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-blue-600 text-white text-xs whitespace-nowrap font-medium">You</div>
        </div>
      </div>

      {/* Report markers */}
      {r.map((report, idx) => {
        const pos = project(report?.location?.lat ?? 0, report?.location?.lng ?? 0);
        const color = severityColors[report?.severity ?? ''] ?? '#64748b';
        return (
          <button
            key={report?.id ?? idx}
            onClick={() => onMarkerClick(report)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group z-0"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            title={`${report?.title ?? 'Report'} (${report?.severity ?? 'unknown'})`}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-150"
              style={{ backgroundColor: color }}
            />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-slate-900 text-white text-xs whitespace-nowrap pointer-events-none z-20">
              {report.title}
            </div>
          </button>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur text-xs space-y-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Critical</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> High</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500" /> Medium</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Low</div>
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-700"><div className="w-3 h-3 rounded-full bg-blue-600" /> Admin</div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{value}</p>
    </div>
  );
}
