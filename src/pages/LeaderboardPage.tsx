import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { gamificationService } from '@/services/api';
import { supabase } from '@/services/supabaseClient';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { LeaderboardEntry } from '@/types';
import { getLevelColor } from '@/utils/helpers';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await gamificationService.getLeaderboard();
      setEntries(data);
      setLoading(false);
    })();
  }, []);

  // ── Realtime: refresh leaderboard when profiles change (points/level) ──
  useRealtimeTable('profiles', async () => {
    try {
      const { data: rows } = await supabase
        .from('profiles')
        .select('id, full_name, email, points, trust_score, level, reports_verified, city, avatar_url')
        .order('points', { ascending: false })
        .limit(20);
      if (rows) {
        const mapped: LeaderboardEntry[] = rows.map((p: any, i: number) => ({
          rank: i + 1,
          userId: p.id,
          name: p.full_name ?? p.email?.split('@')[0] ?? 'Anonymous',
          avatar: p.avatar_url ?? undefined,
          points: p.points ?? 0,
          level: p.level ?? 'Bronze',
          reportsVerified: p.reports_verified ?? 0,
          trustScore: p.trust_score ?? 50,
          city: p.city ?? '',
        }));
        setEntries(mapped);
      }
    } catch { /* ignore */ }
  }, undefined);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <DashboardLayout>
      {/* Top 3 podium */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
          {[1, 0, 2].map((idx) => {
            const entry = top3[idx];
            if (!entry) return <div key={idx} />;
            const heights = ['h-32', 'h-40', 'h-28'];
            const medals = [Medal, Trophy, Award];
            const colors = ['from-amber-400 to-amber-600', 'from-amber-300 to-yellow-500', 'from-orange-400 to-orange-600'];
            const MedalIcon = medals[idx];
            return (
              <motion.div key={entry.userId} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white text-lg font-bold mb-2 shadow-lg ${idx === 0 ? 'ring-4 ring-amber-300/50' : ''}`}>
                  {entry.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white text-center truncate w-full">{entry.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{entry.points.toLocaleString()} pts</p>
                <motion.div initial={{ height: 0 }} animate={{ height: idx === 0 ? '8rem' : idx === 1 ? '6rem' : '5rem' }} transition={{ delay: 0.3, duration: 0.5 }} className={`w-full mt-3 rounded-t-2xl bg-gradient-to-b ${colors[idx]} flex items-start justify-center pt-3`}>
                  <MedalIcon className="w-6 h-6 text-white" />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full leaderboard */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-700/50 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Global Leaderboard</h3>
        </div>

        {loading ? (
          <div className="p-5"><TableSkeleton rows={8} /></div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${entry.userId === user?.id ? 'bg-blue-50 dark:bg-blue-500/10 border-l-4 border-blue-500' : ''}`}
              >
                <span className={`text-lg font-bold w-8 text-center ${entry.rank <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>#{entry.rank}</span>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getLevelColor(entry.level)} flex items-center justify-center text-white text-sm font-bold`}>
                  {entry.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{entry.name} {entry.userId === user?.id && <span className="text-xs text-blue-600 dark:text-blue-400">(You)</span>}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{entry.level} · {entry.city} · {entry.reportsVerified} reports verified</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.points.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3" /> Trust {entry.trustScore}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
