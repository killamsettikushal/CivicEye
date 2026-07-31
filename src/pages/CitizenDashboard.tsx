import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Coins, ShieldCheck, Trophy, FileText, CheckCircle2, Clock,
  FilePlus, Car, Map, Gift, Bell, TrendingUp, Award, ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { reportService, gamificationService } from '@/services/api';
import { adminReportService } from '@/services/adminReportService';
import { supabase } from '@/services/supabaseClient';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Report, Badge, LeaderboardEntry } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/data/mockData';
import { getStatusColor, getSeverityColor, timeAgo, pointsToNextLevel, getLevelColor } from '@/utils/helpers';

export function CitizenDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [b, l] = await Promise.all([
          gamificationService.getBadges(),
          gamificationService.getLeaderboard(),
        ]);
        setBadges(b);
        setLeaderboard(l.slice(0, 5));

        // Fetch the citizen's reports from Supabase (single source of truth for status)
        const { data: supaUser } = await supabase.auth.getUser();
        const userId = supaUser.user?.id;
        if (userId) {
          const { data: rows, error } = await supabase
            .from('reports')
            .select('*')
            .eq('reporter_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (error) {
            console.error('[CitizenDashboard] Failed to fetch reports from Supabase:', error.code, error.message);
          } else if (rows) {
            const mapped: Report[] = rows.map((r: any) => ({
              id: r.id,
              incidentId: r.incident_id,
              category: r.category,
              categoryGroup: r.category_group,
              title: r.title,
              description: r.description ?? '',
              status: r.status,
              severity: r.severity,
              location: { lat: r.lat ?? 0, lng: r.lng ?? 0, address: r.address ?? '', city: r.city ?? '' },
              timestamp: r.created_at,
              reporterId: r.reporter_id ?? '',
              reporterName: r.reporter_name ?? 'Anonymous',
              department: r.department ?? '',
              evidenceUrls: r.evidence_urls ?? [],
              aiResult: r.ai_result ?? undefined,
              vehicleNumber: r.vehicle_number ?? undefined,
              vehicleType: r.vehicle_type ?? undefined,
            } as any));
            console.log('[CitizenDashboard] Loaded reports from Supabase:', mapped.map((m) => ({ id: m.id, status: m.status })));
            setReports(mapped);
          }
        } else {
          // No authenticated session — fall back to localStorage for demo purposes
          const r = await reportService.getReports();
          setReports(r.slice(0, 5));
        }
      } catch (err) {
        console.error('[CitizenDashboard] Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Realtime: refresh reports + leaderboard when the DB changes ──
  useRealtimeTable('reports', async () => {
    try {
      const { data: supaUser } = await supabase.auth.getUser();
      const userId = supaUser.user?.id;
      if (!userId) return;
      const { data: rows } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (rows) {
        setReports(rows.map((r: any) => ({
          id: r.id, incidentId: r.incident_id, category: r.category,
          categoryGroup: r.category_group, title: r.title, description: r.description ?? '',
          status: r.status, severity: r.severity,
          location: { lat: r.lat ?? 0, lng: r.lng ?? 0, address: r.address ?? '', city: r.city ?? '' },
          timestamp: r.created_at, reporterId: r.reporter_id ?? '', reporterName: r.reporter_name ?? 'Anonymous',
          department: r.department ?? '', evidenceUrls: r.evidence_urls ?? [],
          aiResult: r.ai_result ?? undefined, vehicleNumber: r.vehicle_number ?? undefined,
          vehicleType: r.vehicle_type ?? undefined,
        } as any)));
      }
    } catch { /* ignore realtime refresh errors */ }
  }, undefined);

  const levelProgress = user ? pointsToNextLevel(user.points) : null;

  const quickActions = [
    { label: 'Report Infrastructure', icon: FilePlus, path: '/report?type=infrastructure', color: 'from-blue-500 to-blue-600' },
    { label: 'Report Traffic', icon: Car, path: '/report?type=traffic', color: 'from-emerald-500 to-emerald-600' },
    { label: 'View Reports', icon: FileText, path: '/reports', color: 'from-amber-500 to-orange-500' },
    { label: 'Rewards', icon: Gift, path: '/rewards', color: 'from-purple-500 to-indigo-500' },
    { label: 'Notifications', icon: Bell, path: '/notifications', color: 'from-cyan-500 to-blue-500' },
  ];

  return (
    <DashboardLayout>
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-emerald-500/5" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Welcome back, {user?.name?.split(' ')[0]}!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Here's your civic impact summary for today.</p>
          </div>
          <Link to="/report" className="btn-primary">
            <FilePlus className="w-4 h-4" /> New Report
          </Link>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Coins} label="Current Points" value={user?.points.toLocaleString() ?? '0'} color="amber" delay={0} />
            <StatCard icon={ShieldCheck} label="Trust Score" value={user?.trustScore ?? 0} color="emerald" delay={0.05} />
            <StatCard icon={Trophy} label="Leaderboard Rank" value={`#${user?.rank ?? '-'}`} color="violet" delay={0.1} />
            <StatCard icon={FileText} label="Total Reports" value={user?.reportsSubmitted ?? 0} color="blue" delay={0.15} />
            <StatCard icon={CheckCircle2} label="Reports Verified" value={user?.reportsVerified ?? 0} color="green" delay={0.2} />
            <StatCard icon={Clock} label="Reports Pending" value={(user?.reportsSubmitted ?? 0) - (user?.reportsVerified ?? 0)} color="orange" delay={0.25} />
          </>
        )}
      </div>

      {/* Level progress */}
      {levelProgress && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getLevelColor(user?.level ?? 'Bronze')} flex items-center justify-center`}>
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.level} Level</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.points} / {levelProgress.next} points to {levelProgress.nextLevel}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{Math.round(levelProgress.progress)}%</span>
          </div>
          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress.progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`h-full bg-gradient-to-r ${getLevelColor(user?.level ?? 'Bronze')} rounded-full`}
            />
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {quickActions.map((action, i) => (
          <motion.div key={action.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={action.path} className="glass-card glass-card-hover p-4 flex flex-col items-center gap-2 text-center h-full">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{action.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent reports */}
        <div className="lg:col-span-2">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Reports</h3>
              <Link to="/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? (
              <TableSkeleton rows={4} />
            ) : reports.length === 0 ? (
              <EmptyState icon={FileText} title="No reports yet" description="Start reporting civic issues to see them here." action={<Link to="/report" className="btn-primary">Report Now</Link>} />
            ) : (
              <div className="space-y-2">
                {reports.map((report, i) => {
                  const statusColor = getStatusColor(report.status);
                  const sevColor = getSeverityColor(report.severity);
                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className={`w-2 h-10 rounded-full`} style={{ backgroundColor: sevColor.text.includes('emerald') ? '#10b981' : sevColor.text.includes('amber') ? '#f59e0b' : sevColor.text.includes('orange') ? '#f97316' : '#ef4444' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{report.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{report.incidentId} · {CATEGORY_LABELS[report.category]} · {timeAgo(report.timestamp)}</p>
                      </div>
                      <span className={`badge ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>{STATUS_LABELS[report.status]}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: achievements + leaderboard */}
        <div className="space-y-6">
          {/* Achievements */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Achievements</h3>
              <Link to="/rewards" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {badges.slice(0, 8).map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl ${badge.earned ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-50 dark:bg-slate-800/50 opacity-50'}`}
                  title={badge.description}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${badge.earned ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <Award className={`w-4 h-4 ${badge.earned ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-[10px] text-center text-slate-600 dark:text-slate-300 leading-tight">{badge.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Leaderboard preview */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Leaderboard</h3>
              <Link to="/leaderboard" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</Link>
            </div>
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${entry.userId === user?.id ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20' : ''}`}
                >
                  <span className={`text-sm font-bold w-6 text-center ${entry.rank <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>#{entry.rank}</span>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {entry.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{entry.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{entry.level}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{entry.points.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
