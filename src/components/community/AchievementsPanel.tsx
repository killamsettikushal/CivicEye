import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Flame, Trophy, Award, TrendingUp } from 'lucide-react';
import type { CommunityAchievement, CommunityStreak } from '@/types';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getInitials } from '@/utils/helpers';

const ACHIEVEMENT_CATEGORY_COLORS: Record<string, string> = {
  contribution: 'from-blue-500 to-blue-600',
  engagement: 'from-emerald-500 to-teal-600',
  events: 'from-amber-500 to-orange-600',
  groups: 'from-purple-500 to-indigo-600',
  streak: 'from-red-500 to-orange-600',
  recognition: 'from-yellow-400 to-amber-600',
};

export function AchievementsPanel() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [achievements, setAchievements] = useState<CommunityAchievement[]>([]);
  const [streak, setStreak] = useState<CommunityStreak | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; name: string; username: string; avatar: string | null; postCount: number; streak: number; level: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ach, str, lb] = await Promise.all([
        communityService.getAchievements(user.id),
        communityService.getStreak(user.id),
        communityService.getContributorLeaderboard(10),
      ]);
      setAchievements(ach);
      setStreak(str);
      setLeaderboard(lb);
    } catch { showToast('Failed to load achievements', 'error'); }
    finally { setLoading(false); }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] ?? Award;
    return Icon;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6 h-32 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass-card p-5 h-32 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalPoints = achievements.filter((a) => a.earned).reduce((s, a) => s + a.points, 0);

  return (
    <div className="space-y-6">
      {/* Streak + stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center"><Flame className="w-6 h-6 text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{streak?.currentStreak ?? 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Day Streak</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center"><Trophy className="w-6 h-6 text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{earnedCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Badges Earned</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center"><Award className="w-6 h-6 text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalPoints}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Achievement Points</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Longest streak */}
      {streak && streak.longestStreak > 0 && (
        <div className="glass-card p-4 flex items-center gap-3">
          <Flame className="w-5 h-5 text-orange-500" />
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Longest streak: <strong>{streak.longestStreak} days</strong> · Total active days: <strong>{streak.totalActiveDays}</strong>
          </p>
        </div>
      )}

      {/* Achievements grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">All Achievements</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach, i) => {
            const Icon = getIcon(ach.icon);
            const color = ACHIEVEMENT_CATEGORY_COLORS[ach.category] ?? 'from-slate-400 to-slate-600';
            return (
              <motion.div key={ach.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className={`glass-card p-5 ${ach.earned ? '' : 'opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center ${ach.earned ? '' : 'grayscale'}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ach.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ach.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {ach.earned ? (
                        <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[10px]">
                          <Award className="w-3 h-3" /> Earned
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 text-[10px]">
                          {ach.threshold} required
                        </span>
                      )}
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">+{ach.points} pts</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Contributor Leaderboard */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Contributor Leaderboard
        </h3>
        <div className="glass-card p-5">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No contributors yet. Start posting to climb the ranks!</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <motion.div key={entry.userId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={`flex items-center gap-3 p-3 rounded-xl ${entry.userId === user?.id ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <span className={`text-sm font-bold w-6 text-center ${i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>#{i + 1}</span>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    {entry.avatar ? <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" /> : getInitials(entry.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{entry.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">@{entry.username} · {entry.level}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="flex items-center gap-1 text-xs text-orange-500"><Flame className="w-3.5 h-3.5" />{entry.streak}</div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{entry.postCount}</span>
                    <span className="text-xs text-slate-400">posts</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
