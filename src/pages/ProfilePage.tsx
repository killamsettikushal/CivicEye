import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User as UserIcon, Award, ShieldCheck, Bell, Lock, Mail, Phone, MapPin,
  Calendar, TrendingUp, CheckCircle2, XCircle, Target,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { gamificationService } from '@/services/api';
import type { Badge, TrustScoreHistory } from '@/types';
import { getLevelColor, pointsToNextLevel } from '@/utils/helpers';
import { TrustScoreChart } from '@/components/charts/Charts';

export function ProfilePage() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [trustHistory, setTrustHistory] = useState<TrustScoreHistory[]>([]);

  useEffect(() => {
    (async () => {
      const [b, t] = await Promise.all([gamificationService.getBadges(), gamificationService.getTrustHistory()]);
      setBadges(b);
      setTrustHistory(t);
    })();
  }, []);

  const levelProgress = user ? pointsToNextLevel(user.points) : null;
  const earnedBadges = badges.filter((b) => b.earned);
  const acceptanceRate = user && user.reportsSubmitted > 0 ? Math.round((user.reportsVerified / user.reportsSubmitted) * 100) : 0;

  return (
    <DashboardLayout>
      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getLevelColor(user?.level ?? 'Bronze')} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
            {user?.name?.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className={`badge bg-gradient-to-r ${getLevelColor(user?.level ?? 'Bronze')} text-white border-0`}>{user?.level}</span>
              <span className="badge bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20">Rank #{user?.rank}</span>
              <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">{user?.points} points</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: CheckCircle2, label: 'Reports Verified', value: user?.reportsVerified ?? 0, color: 'text-emerald-500' },
          { icon: XCircle, label: 'Reports Rejected', value: user?.reportsRejected ?? 0, color: 'text-red-500' },
          { icon: Target, label: 'Acceptance Rate', value: `${acceptanceRate}%`, color: 'text-blue-500' },
          { icon: ShieldCheck, label: 'Trust Score', value: user?.trustScore ?? 0, color: 'text-amber-500' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <p className="text-xs text-slate-400 uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <div className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-500" /> Personal Information
          </h3>
          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={user?.email ?? '-'} />
            <InfoRow icon={Phone} label="Phone" value={user?.phone ?? 'Not set'} />
            <InfoRow icon={MapPin} label="City" value={user?.city ?? 'Not set'} />
            <InfoRow icon={Calendar} label="Member Since" value={user ? new Date(user.joinedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '-'} />
          </div>
        </div>

        {/* Trust Score Chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Trust Score Trend
          </h3>
          <TrustScoreChart data={trustHistory} />
        </div>
      </div>

      {/* Badges */}
      <div className="glass-card p-5 mt-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" /> Achievements ({earnedBadges.length}/{badges.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {badges.map((badge, i) => (
            <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className={`p-3 rounded-xl text-center ${badge.earned ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-50 dark:bg-slate-800/30 opacity-50'}`}>
              <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${badge.earned ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <Award className={`w-5 h-5 ${badge.earned ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{badge.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}
