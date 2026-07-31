import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell, CheckCheck, FileText, Brain, Route, Wrench, CheckCircle2, Gift,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/StatCard';
import { notificationService } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { supabase } from '@/services/supabaseClient';
import type { Notification } from '@/types';
import { timeAgo } from '@/utils/helpers';

const NOTIF_ICONS: Record<string, any> = {
  'report-submitted': FileText,
  'ai-completed': Brain,
  'department-assigned': Route,
  'repair-started': Wrench,
  'issue-resolved': CheckCircle2,
  'reward-credited': Gift,
};

const NOTIF_COLORS: Record<string, string> = {
  'report-submitted': 'bg-blue-100 dark:bg-blue-500/10 text-blue-500',
  'ai-completed': 'bg-purple-100 dark:bg-purple-500/10 text-purple-500',
  'department-assigned': 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-500',
  'repair-started': 'bg-amber-100 dark:bg-amber-500/10 text-amber-500',
  'issue-resolved': 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500',
  'reward-credited': 'bg-orange-100 dark:bg-orange-500/10 text-orange-500',
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      setLoading(false);
    })();
  }, []);

  // ── Realtime: refresh notifications when new ones arrive ──
  useRealtimeTable('notifications', async () => {
    try {
      const { data: supaUser } = await supabase.auth.getUser();
      const userId = supaUser.user?.id;
      if (!userId) return;
      const { data: rows } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (rows) {
        const mapped: Notification[] = rows.map((n: any) => ({
          id: n.id,
          type: n.type ?? 'report-submitted',
          title: n.title ?? '',
          message: n.message ?? '',
          timestamp: n.created_at ?? new Date().toISOString(),
          read: n.read ?? false,
          reportId: n.report_id ?? undefined,
        }));
        setNotifications(mapped);
      }
    } catch { /* ignore */ }
  }, undefined);

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'success');
  };

  const handleMarkRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && <span className="badge bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20">{unreadCount} new</span>}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-ghost text-sm">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You'll see updates about your reports here." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((notif, i) => {
              const Icon = NOTIF_ICONS[notif.type] ?? Bell;
              const color = NOTIF_COLORS[notif.type] ?? 'bg-slate-100 text-slate-500';
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => !notif.read && handleMarkRead(notif.id)}
                  className={`flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{notif.title}</p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.timestamp)}</p>
                  </div>
                  {notif.reportId && <Link to={`/result/${notif.reportId}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0">View</Link>}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
