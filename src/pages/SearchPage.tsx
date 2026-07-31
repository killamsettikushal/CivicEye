import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, FileText, Car, MapPin, User, Building2, Filter, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/StatCard';
import { reportService } from '@/services/api';
import type { Report } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/data/mockData';
import { getStatusColor, timeAgo } from '@/utils/helpers';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const data = await reportService.getReports({ search: query });
      setResults(data);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = filter ? results.filter((r) => {
    if (filter === 'vehicle') return !!r.vehicleNumber;
    if (filter === 'traffic') return r.categoryGroup === 'traffic';
    if (filter === 'infrastructure') return r.categoryGroup === 'infrastructure';
    return true;
  }) : results;

  return (
    <DashboardLayout>
      <div className="glass-card p-6 mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Incident ID, Vehicle Number, Location, Citizen, Department, Status, Category..."
            className="input-field pl-12 pr-12 text-base"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', 'Infrastructure', 'Traffic', 'Vehicle'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f === 'All' ? '' : f.toLowerCase())}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (filter || 'All') === f ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {query && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">{loading ? 'Searching...' : `${filtered.length} result(s) for "${query}"`}</p>
          </div>
          {filtered.length === 0 && !loading ? (
            <EmptyState icon={Search} title="No results found" description={`No reports match "${query}". Try different keywords.`} />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((report, i) => {
                const statusColor = getStatusColor(report.status);
                return (
                  <Link key={report.id} to={`/result/${report.id}`} className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{report.incidentId}</p>
                          <span className={`badge ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>{STATUS_LABELS[report.status]}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 truncate">{report.title}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Filter className="w-3 h-3" /> {CATEGORY_LABELS[report.category]}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {report.location.address}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {report.reporterName}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {report.department}</span>
                          {report.vehicleNumber && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {report.vehicleNumber}</span>}
                          <span>· {timeAgo(report.timestamp)}</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
