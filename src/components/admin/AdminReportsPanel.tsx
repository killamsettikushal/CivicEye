import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Clock, CheckCircle2, XCircle, AlertTriangle, Search,
  Eye, Check, X, Route, Download, Filter, Inbox, ChevronDown,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/StatCard';
import { adminReportService, type AdminReport, type AdminReportStats } from '@/services/adminReportService';
import { useToast } from '@/contexts/ToastContext';
import { CATEGORY_LABELS, STATUS_LABELS, DEPARTMENTS, SEVERITY_COLORS } from '@/data/mockData';
import { formatDateTime, timeAgo } from '@/utils/helpers';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'ai-processing', label: 'AI Processing' },
  { value: 'verified', label: 'Verified' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'under_progress', label: 'Under Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

function severityBadge(sev: string) {
  const color = SEVERITY_COLORS[sev] ?? '#94a3b8';
  return (
    <span
      className="badge border"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
    >
      {sev}
    </span>
  );
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',
    'ai-processing': 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    verified: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    rejected: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
    assigned: 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
    under_progress: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    resolved: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20',
  };
  return <span className={`badge border ${styles[status] ?? styles.pending}`}>{STATUS_LABELS[status] ?? status}</span>;
}

export function AdminReportsPanel() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<AdminReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [assignDept, setAssignDept] = useState('');
  const [newSeverity, setNewSeverity] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalReport, setStatusModalReport] = useState<AdminReport | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        adminReportService.getReports({
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
          search: search || undefined,
        }),
        adminReportService.getReportStats(),
      ]);
      setReports(r);
      setStats(s);
    } catch (err) {
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, search, showToast]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const openDrawer = (report: AdminReport) => {
    setSelected(report);
    setAssignDept(report.department);
    setNewSeverity(report.severity);
    setAdminNotes(report.admin_notes ?? '');
    setDrawerOpen(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      if (status === 'verified') {
        const result = await adminReportService.verifyAndReward(id, 'verify');
        if (!result.success) throw new Error(result.error ?? 'Verification failed');
        showToast(`Report verified — citizen earned ${result.points_awarded ?? 0} points!`, 'success');
      } else if (status === 'resolved') {
        const result = await adminReportService.verifyAndReward(id, 'resolve');
        if (!result.success) throw new Error(result.error ?? 'Resolve failed');
        showToast(`Issue resolved — citizen earned ${result.points_awarded ?? 0} points!`, 'success');
      } else if (status === 'rejected') {
        const result = await adminReportService.verifyAndReward(id, 'reject');
        if (!result.success) throw new Error(result.error ?? 'Rejection failed');
        showToast('Report rejected', 'warning');
      } else {
        await adminReportService.updateReportStatus(id, status);
        showToast(`Report status updated to ${STATUS_LABELS[status] ?? status}`, 'success');
      }
      setStatusModalOpen(false);
      setStatusModalReport(null);
      await loadReports();
      if (selected?.id === id) {
        const refreshed = (await adminReportService.getReports()).find((r: any) => r.id === id);
        if (refreshed) {
          setSelected(refreshed);
        }
      }
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to update status', 'error');
    }
  };

  const handleAssign = async () => {
    if (!selected || !assignDept) return;
    try {
      await adminReportService.assignDepartment(selected.id, assignDept);
      showToast(`Assigned to ${assignDept}`, 'success');
      setDrawerOpen(false);
      loadReports();
    } catch {
      showToast('Failed to assign department', 'error');
    }
  };

  const handleSeverityChange = async () => {
    if (!selected) return;
    try {
      await adminReportService.updateReportSeverity(selected.id, newSeverity);
      showToast(`Severity updated to ${newSeverity}`, 'success');
      loadReports();
    } catch {
      showToast('Failed to update severity', 'error');
    }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    try {
      await adminReportService.setAdminNotes(selected.id, adminNotes);
      showToast('Admin notes saved', 'success');
    } catch {
      showToast('Failed to save notes', 'error');
    }
  };

  const handleDownload = (report: AdminReport) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.incident_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report downloaded', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 space-y-2">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))
        ) : (
          <>
            <MiniStat icon={Inbox} label="Total" value={stats?.total ?? 0} color="text-blue-600 dark:text-blue-400" />
            <MiniStat icon={Clock} label="Pending" value={stats?.pending ?? 0} color="text-amber-600 dark:text-amber-400" />
            <MiniStat icon={CheckCircle2} label="Verified" value={stats?.verified ?? 0} color="text-emerald-600 dark:text-emerald-400" />
            <MiniStat icon={XCircle} label="Rejected" value={stats?.rejected ?? 0} color="text-red-600 dark:text-red-400" />
            <MiniStat icon={AlertTriangle} label="Critical" value={stats?.critical ?? 0} color="text-orange-600 dark:text-orange-400" />
            <MiniStat icon={FileText} label="Today" value={stats?.todayCount ?? 0} color="text-violet-600 dark:text-violet-400" />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, title, reporter, department..."
            className="input-field !pl-10"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field !pl-9 appearance-none pr-8">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="input-field appearance-none pr-8">
              {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Reports table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-5"><TableSkeleton rows={6} /></div>
        ) : reports.length === 0 ? (
          <EmptyState icon={Inbox} title="No reports found" description="No reports match your current filters. Try adjusting your search or filters." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200/60 dark:border-slate-700/50">
                    <th className="px-5 py-3 font-medium">Incident ID</th>
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Reporter</th>
                    <th className="px-5 py-3 font-medium">Severity</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Department</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, i) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{report.incident_id}</p>
                        <p className="text-xs text-slate-400">{timeAgo(report.created_at)}</p>
                      </td>
                      <td className="px-5 py-3 max-w-[200px]">
                        <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{report.title}</p>
                        <p className="text-xs text-slate-400">{CATEGORY_LABELS[report.category as keyof typeof CATEGORY_LABELS] ?? report.category}</p>
                      </td>
                      <td className="px-5 py-3"><span className="text-sm text-slate-600 dark:text-slate-300">{report.reporter_name}</span></td>
                      <td className="px-5 py-3">{severityBadge(report.severity)}</td>
                      <td className="px-5 py-3">{statusBadge(report.status)}</td>
                      <td className="px-5 py-3"><span className="text-sm text-slate-600 dark:text-slate-300">{report.department || '—'}</span></td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openDrawer(report)} className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="View details"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => { setStatusModalReport(report); setStatusModalOpen(true); }} className="p-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10" title="Change status"><Route className="w-4 h-4" /></button>
                          <button onClick={() => handleStatusChange(report.id, 'verified')} className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title="Verify"><Check className="w-4 h-4" /></button>
                          <button onClick={() => handleStatusChange(report.id, 'rejected')} className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10" title="Reject"><X className="w-4 h-4" /></button>
                          <button onClick={() => handleDownload(report)} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Download"><Download className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {reports.map((report, i) => (
                <motion.div key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{report.incident_id}</p>
                      <p className="text-xs text-slate-400">{timeAgo(report.created_at)}</p>
                    </div>
                    {statusBadge(report.status)}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">{report.title}</p>
                  <p className="text-xs text-slate-400 mb-2">By {report.reporter_name} · {report.department || 'Unassigned'}</p>
                  <div className="flex items-center gap-2">
                    {severityBadge(report.severity)}
                    <div className="flex gap-1 ml-auto">
                      <button onClick={() => openDrawer(report)} className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => { setStatusModalReport(report); setStatusModalOpen(true); }} className="p-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"><Route className="w-4 h-4" /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Report details drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.incident_id ?? ''}>
        {selected && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selected.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selected.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Category" value={CATEGORY_LABELS[selected.category as keyof typeof CATEGORY_LABELS] ?? selected.category} />
              <InfoBox label="Severity" value={(selected.severity ?? 'medium').toUpperCase()} />
              <InfoBox label="Status" value={STATUS_LABELS[selected.status] ?? selected.status} />
              <InfoBox label="Department" value={selected.department || 'Unassigned'} />
              <InfoBox label="Location" value={selected.address || 'N/A'} />
              <InfoBox label="Submitted" value={formatDateTime(selected.created_at)} />
              {selected.vehicle_number && <InfoBox label="Vehicle Number" value={selected.vehicle_number} />}
              {selected.vehicle_type && <InfoBox label="Vehicle Type" value={selected.vehicle_type} />}
              <InfoBox label="Reporter" value={selected.reporter_name} />
            </div>

            {selected.ai_result && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">AI Summary</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selected.ai_result.incidentSummary}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-500">Confidence: <strong className="text-slate-700 dark:text-slate-200">{Math.round((selected.ai_result.confidenceScore ?? 0) * 100)}%</strong></span>
                  <span className="text-slate-500">Evidence: <strong className="text-slate-700 dark:text-slate-200">{Math.round((selected.ai_result.evidenceQuality ?? 0) * 100)}%</strong></span>
                  <span className="text-slate-500">Duplicate Prob: <strong className="text-slate-700 dark:text-slate-200">{Math.round((selected.ai_result.duplicateProbability ?? 0) * 100)}%</strong></span>
                </div>
              </div>
            )}

            {/* Status quick change */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Quick Status Change</label>
              <select
                value={selected.status}
                onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                className="input-field"
              >
                {STATUS_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Severity change */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Update Severity</label>
              <div className="flex gap-2">
                <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value)} className="input-field flex-1">
                  {SEVERITY_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={handleSeverityChange} className="btn-secondary"><Check className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Assign Department */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Assign Department</label>
              <select value={assignDept} onChange={(e) => setAssignDept(e.target.value)} className="input-field">
                <option value="">Select department...</option>
                {DEPARTMENTS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <button onClick={handleAssign} disabled={!assignDept} className="btn-secondary w-full mt-2 disabled:opacity-50">
                <Route className="w-4 h-4" /> Assign Department
              </button>
            </div>

            {/* Admin notes */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Add internal notes about this report..."
                className="input-field resize-none"
              />
              <button onClick={handleSaveNotes} className="btn-secondary w-full mt-2"><Check className="w-4 h-4" /> Save Notes</button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleStatusChange(selected.id, 'verified')} className="btn-primary !bg-emerald-600 !from-emerald-600 !to-emerald-500">
                <Check className="w-4 h-4" /> Verify
              </button>
              <button onClick={() => handleStatusChange(selected.id, 'rejected')} className="btn-primary !bg-red-600 !from-red-600 !to-red-500">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
            <button onClick={() => handleDownload(selected)} className="btn-ghost w-full">
              <Download className="w-4 h-4" /> Download Report
            </button>
          </div>
        )}
      </Drawer>

      {/* Status change modal (mobile-friendly quick change) */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Change Report Status" size="sm">
        {statusModalReport && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Update status for <strong className="text-slate-900 dark:text-white">{statusModalReport.incident_id}</strong>:
              <br />
              <span className="text-slate-600 dark:text-slate-300">{statusModalReport.title}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                <button
                  key={o.value}
                  onClick={() => handleStatusChange(statusModalReport.id, o.value)}
                  className={`p-3 rounded-xl text-sm font-medium border transition-colors ${
                    statusModalReport.status === o.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </motion.div>
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
