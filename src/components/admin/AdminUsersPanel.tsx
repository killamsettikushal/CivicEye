import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Flag, Ban, ShieldCheck, AlertTriangle, Eye,
  UserX, UserCheck, ChevronDown, Filter, FileText, ShieldOff,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/StatCard';
import { adminReportService, type AdminUserRow, type AdminUserStats, type AdminReport } from '@/services/adminReportService';
import { useToast } from '@/contexts/ToastContext';
import { formatDateTime, timeAgo } from '@/utils/helpers';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'banned', label: 'Banned' },
];

export function AdminUsersPanel() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'flagged' | 'banned'>('all');
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagUser, setFlagUser] = useState<AdminUserRow | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [detailsUser, setDetailsUser] = useState<AdminUserRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [userReports, setUserReports] = useState<AdminReport[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        adminReportService.getUsers({
          search: search || undefined,
          flaggedOnly: filter === 'flagged' || undefined,
          bannedOnly: filter === 'banned' || undefined,
        }),
        adminReportService.getUserStats(),
      ]);
      setUsers(u);
      setStats(s);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filter, showToast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openFlagModal = (user: AdminUserRow) => {
    setFlagUser(user);
    setFlagReason(user.flagged_reason ?? '');
    setFlagModalOpen(true);
  };

  const handleFlag = async () => {
    if (!flagUser || !flagReason.trim()) {
      showToast('Please provide a reason for flagging', 'warning');
      return;
    }
    try {
      await adminReportService.flagUser(flagUser.id, flagReason.trim());
      showToast(`${flagUser.full_name || flagUser.email} has been flagged`, 'warning');
      setFlagModalOpen(false);
      setFlagUser(null);
      setFlagReason('');
      loadUsers();
    } catch {
      showToast('Failed to flag user', 'error');
    }
  };

  const handleUnflag = async (user: AdminUserRow) => {
    try {
      await adminReportService.unflagUser(user.id);
      showToast(`${user.full_name || user.email} has been unflagged`, 'success');
      loadUsers();
    } catch {
      showToast('Failed to unflag user', 'error');
    }
  };

  const handleBan = async (user: AdminUserRow) => {
    try {
      await adminReportService.banUser(user.id);
      showToast(`${user.full_name || user.email} has been banned`, 'warning');
      loadUsers();
    } catch {
      showToast('Failed to ban user', 'error');
    }
  };

  const handleUnban = async (user: AdminUserRow) => {
    try {
      await adminReportService.unbanUser(user.id);
      showToast(`${user.full_name || user.email} has been unbanned`, 'success');
      loadUsers();
    } catch {
      showToast('Failed to unban user', 'error');
    }
  };

  const openDetails = async (user: AdminUserRow) => {
    setDetailsUser(user);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const reports = await adminReportService.getUserReports(user.id);
      setUserReports(reports);
    } catch {
      setUserReports([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-4 space-y-2">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))
        ) : (
          <>
            <MiniStat icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} color="text-blue-600 dark:text-blue-400" />
            <MiniStat icon={Flag} label="Flagged" value={stats?.flaggedCount ?? 0} color="text-amber-600 dark:text-amber-400" />
            <MiniStat icon={Ban} label="Banned" value={stats?.bannedCount ?? 0} color="text-red-600 dark:text-red-400" />
            <MiniStat icon={ShieldCheck} label="Admins" value={stats?.adminCount ?? 0} color="text-violet-600 dark:text-violet-400" />
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
            placeholder="Search by name, email, city..."
            className="input-field !pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="input-field !pl-9 appearance-none pr-8"
          >
            {FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Users table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-5"><TableSkeleton rows={6} /></div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="No users match your current filters." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200/60 dark:border-slate-700/50">
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Reports</th>
                    <th className="px-5 py-3 font-medium">Trust</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${user.banned ? 'opacity-60' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                            {(user.full_name || user.email).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.full_name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {user.role === 'admin' ? (
                          <span className="badge bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20">Admin</span>
                        ) : (
                          <span className="badge bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20">Citizen</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{user.reports_submitted}</span>
                        <span className="text-xs text-slate-400 ml-1">({user.reports_verified} verified)</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-semibold ${user.trust_score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : user.trust_score >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          {user.trust_score}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {user.flagged_fake && (
                            <span className="badge bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" title={user.flagged_reason ?? 'Flagged'}>
                              <Flag className="w-3 h-3 mr-1" /> Fake
                            </span>
                          )}
                          {user.banned && (
                            <span className="badge bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20">
                              <Ban className="w-3 h-3 mr-1" /> Banned
                            </span>
                          )}
                          {!user.flagged_fake && !user.banned && (
                            <span className="badge bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openDetails(user)} className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="View details"><Eye className="w-4 h-4" /></button>
                          {user.role !== 'admin' && (
                            <>
                              {!user.flagged_fake ? (
                                <button onClick={() => openFlagModal(user)} className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10" title="Flag as fake"><Flag className="w-4 h-4" /></button>
                              ) : (
                                <button onClick={() => handleUnflag(user)} className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title="Unflag"><UserCheck className="w-4 h-4" /></button>
                              )}
                              {!user.banned ? (
                                <button onClick={() => handleBan(user)} className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10" title="Ban user"><Ban className="w-4 h-4" /></button>
                              ) : (
                                <button onClick={() => handleUnban(user)} className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title="Unban"><UserCheck className="w-4 h-4" /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user, i) => (
                <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className={`p-4 ${user.banned ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                        {(user.full_name || user.email).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.full_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    {user.role === 'admin' && <span className="badge bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20">Admin</span>}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-400">{user.reports_submitted} reports · Trust {user.trust_score}</span>
                    <div className="flex gap-1 ml-auto">
                      {user.flagged_fake && <span className="badge bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"><Flag className="w-3 h-3 mr-1" />Fake</span>}
                      {user.banned && <span className="badge bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"><Ban className="w-3 h-3 mr-1" />Banned</span>}
                      {!user.flagged_fake && !user.banned && <span className="badge bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">Active</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openDetails(user)} className="btn-ghost !py-1.5 !px-3 text-xs"><Eye className="w-3.5 h-3.5" /> Details</button>
                    {user.role !== 'admin' && (
                      <>
                        {!user.flagged_fake ? (
                          <button onClick={() => openFlagModal(user)} className="btn-ghost !py-1.5 !px-3 text-xs text-amber-600 dark:text-amber-400"><Flag className="w-3.5 h-3.5" /> Flag</button>
                        ) : (
                          <button onClick={() => handleUnflag(user)} className="btn-ghost !py-1.5 !px-3 text-xs text-emerald-600 dark:text-emerald-400"><UserCheck className="w-3.5 h-3.5" /> Unflag</button>
                        )}
                        {!user.banned ? (
                          <button onClick={() => handleBan(user)} className="btn-ghost !py-1.5 !px-3 text-xs text-red-600 dark:text-red-400"><Ban className="w-3.5 h-3.5" /> Ban</button>
                        ) : (
                          <button onClick={() => handleUnban(user)} className="btn-ghost !py-1.5 !px-3 text-xs text-emerald-600 dark:text-emerald-400"><UserCheck className="w-3.5 h-3.5" /> Unban</button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Flag modal */}
      <Modal isOpen={flagModalOpen} onClose={() => setFlagModalOpen(false)} title="Flag User as Fake" size="sm">
        {flagUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                You are about to flag <strong>{flagUser.full_name || flagUser.email}</strong> as a fake/suspicious user. Flagged users will be highlighted for review.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Reason for flagging</label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={3}
                placeholder="e.g. Submitting duplicate fake reports, suspicious activity, bot-like behavior..."
                className="input-field resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFlagModalOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleFlag} disabled={!flagReason.trim()} className="btn-primary !bg-amber-600 !from-amber-600 !to-amber-500 disabled:opacity-50">
                <Flag className="w-4 h-4" /> Flag User
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* User details modal */}
      <Modal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} title="User Details" size="lg">
        {detailsUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                {(detailsUser.full_name || detailsUser.email).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{detailsUser.full_name || 'Unknown'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{detailsUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoBox label="Role" value={detailsUser.role} />
              <InfoBox label="City" value={detailsUser.city || 'N/A'} />
              <InfoBox label="Level" value={detailsUser.level} />
              <InfoBox label="Trust Score" value={String(detailsUser.trust_score)} />
              <InfoBox label="Points" value={String(detailsUser.points)} />
              <InfoBox label="Submitted" value={String(detailsUser.reports_submitted)} />
              <InfoBox label="Verified" value={String(detailsUser.reports_verified)} />
              <InfoBox label="Rejected" value={String(detailsUser.reports_rejected)} />
            </div>

            {detailsUser.flagged_fake && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Flagged as Fake</p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{detailsUser.flagged_reason || 'No reason provided'}</p>
                <p className="text-xs text-slate-400 mt-1">{detailsUser.flagged_at ? formatDateTime(detailsUser.flagged_at) : ''}</p>
              </div>
            )}

            {detailsUser.banned && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">User is Banned</p>
                  <span className="text-xs text-slate-400 ml-auto">{detailsUser.banned_at ? formatDateTime(detailsUser.banned_at) : ''}</span>
                </div>
              </div>
            )}

            {/* User's reports */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Submitted Reports ({userReports.length})</h4>
              </div>
              {detailsLoading ? (
                <TableSkeleton rows={3} />
              ) : userReports.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No reports submitted</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userReports.map((report) => (
                    <div key={report.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{report.incident_id}: {report.title}</p>
                        <p className="text-xs text-slate-400">{report.status} · {timeAgo(report.created_at)}</p>
                      </div>
                      <span className="badge bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600/50 capitalize text-xs flex-shrink-0">{report.severity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {detailsUser.role !== 'admin' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {!detailsUser.flagged_fake ? (
                  <button onClick={() => { setDetailsOpen(false); openFlagModal(detailsUser); }} className="btn-secondary !border-amber-300 text-amber-700 dark:text-amber-400">
                    <Flag className="w-4 h-4" /> Flag as Fake
                  </button>
                ) : (
                  <button onClick={() => { handleUnflag(detailsUser); setDetailsOpen(false); }} className="btn-secondary !border-emerald-300 text-emerald-700 dark:text-emerald-400">
                    <ShieldOff className="w-4 h-4" /> Remove Flag
                  </button>
                )}
                {!detailsUser.banned ? (
                  <button onClick={() => { handleBan(detailsUser); setDetailsOpen(false); }} className="btn-primary !bg-red-600 !from-red-600 !to-red-500">
                    <Ban className="w-4 h-4" /> Ban User
                  </button>
                ) : (
                  <button onClick={() => { handleUnban(detailsUser); setDetailsOpen(false); }} className="btn-primary !bg-emerald-600 !from-emerald-600 !to-emerald-500">
                    <UserCheck className="w-4 h-4" /> Unban User
                  </button>
                )}
              </div>
            )}
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
