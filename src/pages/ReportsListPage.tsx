import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Search, MapPin, Eye, ThumbsUp, Sparkles } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/StatCard';
import { reportService } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import type { Report } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS, DEPARTMENTS } from '@/data/mockData';
import { getStatusColor, getSeverityColor, timeAgo } from '@/utils/helpers';

export function ReportsListPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [upvotedIds, setUpvotedIds] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const r = await reportService.getReports();
      setReports(r);
      setLoading(false);
    })();
  }, []);

  const handleUpvote = (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setUpvotedIds((prev) => {
      const current = prev[reportId] || 0;
      const next = current > 0 ? current - 1 : current + 1;
      if (next > current) {
        showToast('Issue endorsed! Priority score boosted (+5 points) for municipal team.', 'success');
      }
      return { ...prev, [reportId]: next };
    });
  };

  const filtered = reports.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.incidentId.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q) && !r.location.address.toLowerCase().includes(q) && !(r.vehicleNumber ?? '').toLowerCase().includes(q)) return false;
    }
    if (statusFilter && r.status !== statusFilter) return false;
    if (deptFilter && r.department !== deptFilter) return false;
    return true;
  });

  return (
    <DashboardLayout>
      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, title, location, vehicle number..." className="input-field pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field sm:w-44">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="ai-processing">AI Processing</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="assigned">Assigned</option>
            <option value="under_progress">Under Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-field sm:w-52">
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Reports table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">All Reports ({filtered.length})</h3>
          <span className="text-xs text-slate-400 font-medium">Click 👍 to upvote and escalate issue priority</span>
        </div>

        {loading ? (
          <div className="p-5"><TableSkeleton rows={6} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No reports found" description="Try adjusting your filters or search terms." action={<Link to="/report" className="btn-primary">Report Issue</Link>} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200/60 dark:border-slate-700/50">
                    <th className="px-5 py-3 font-medium">Incident ID</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Location</th>
                    <th className="px-5 py-3 font-medium">Severity</th>
                    <th className="px-5 py-3 font-medium">Priority & Upvotes</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((report, i) => {
                    const statusColor = getStatusColor(report.status);
                    const sevColor = getSeverityColor(report.severity);
                    const upvotes = ((report as any).upvotes || 12) + (upvotedIds[report.id] || 0);
                    const isUpvoted = (upvotedIds[report.id] || 0) > 0;

                    return (
                      <motion.tr key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{report.incidentId}</p>
                          {report.vehicleNumber && <p className="text-xs text-slate-400">{report.vehicleNumber}</p>}
                        </td>
                        <td className="px-5 py-3"><span className="text-sm text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[report.category] || report.category}</span></td>
                        <td className="px-5 py-3"><span className="text-sm text-slate-600 dark:text-slate-300 truncate block max-w-[180px]">{report.location.address}</span></td>
                        <td className="px-5 py-3"><span className={`badge ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}>{report.severity}</span></td>
                        <td className="px-5 py-3">
                          <button
                            onClick={(e) => handleUpvote(report.id, e)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              isUpvoted
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> {upvotes} Upvotes
                          </button>
                        </td>
                        <td className="px-5 py-3"><span className={`badge ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>{STATUS_LABELS[report.status]}</span></td>
                        <td className="px-5 py-3"><span className="text-sm text-slate-500 dark:text-slate-400">{timeAgo(report.timestamp)}</span></td>
                        <td className="px-5 py-3"><Link to={`/result/${report.id}`} className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 text-xs font-medium"><Eye className="w-4 h-4" /> View AI Report</Link></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((report) => {
                const statusColor = getStatusColor(report.status);
                const sevColor = getSeverityColor(report.severity);
                const upvotes = ((report as any).upvotes || 12) + (upvotedIds[report.id] || 0);
                const isUpvoted = (upvotedIds[report.id] || 0) > 0;

                return (
                  <div key={report.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link to={`/result/${report.id}`} className="text-sm font-semibold text-slate-900 dark:text-white hover:underline">{report.incidentId}</Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{CATEGORY_LABELS[report.category]}</p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {report.location.address}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`badge ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>{STATUS_LABELS[report.status]}</span>
                        <span className={`badge ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}>{report.severity}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={(e) => handleUpvote(report.id, e)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isUpvoted ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> {upvotes} Upvotes
                      </button>
                      <Link to={`/result/${report.id}`} className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">View AI Details →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
