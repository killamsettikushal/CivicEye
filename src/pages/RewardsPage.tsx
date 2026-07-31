import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award, Coins, TrendingUp, Gift, Flame, Crown, BadgeCheck, Copy, Flag,
  ShieldCheck, TrafficCone, ShoppingCart, Fuel, TreePine, Shirt, Coffee,
  Package, Heart, Bus, Check, X, Lock, Ticket, Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { gamificationService, redemptionService } from '@/services/api';
import type { Badge, RewardHistory, RewardItem, Redemption } from '@/types';
import { getLevelColor, pointsToNextLevel, timeAgo } from '@/utils/helpers';

const BADGE_ICONS: Record<string, any> = { Flag, ShieldCheck, TrafficCone, BadgeCheck, Flame, Crown, Copy, Award };
const REWARD_ICONS: Record<string, any> = {
  ShoppingCart, Fuel, TreePine, ShieldCheck, Shirt, Coffee, Package, Heart, Bus, Gift, Crown, Ticket,
};

export function RewardsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rewards, setRewards] = useState<RewardHistory[]>([]);
  const [catalog, setCatalog] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');
  const [redeemModal, setRedeemModal] = useState<RewardItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<Redemption | null>(null);
  const [currentPoints, setCurrentPoints] = useState(user?.points ?? 0);

  const loadData = useCallback(async () => {
    try {
      const [b, r, catalogData, redemptionData, pts] = await Promise.all([
        gamificationService.getBadges(),
        gamificationService.getRewards(),
        redemptionService.getRewards(),
        redemptionService.getRedemptions(),
        redemptionService.getUserPoints(),
      ]);
      setBadges(b);
      setRewards(r);
      setCatalog(catalogData);
      setRedemptions(redemptionData);
      setCurrentPoints(pts);
    } catch (err) {
      // Fall back gracefully
      const [b, r] = await Promise.all([gamificationService.getBadges(), gamificationService.getRewards()]);
      setBadges(b);
      setRewards(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const levelProgress = user ? pointsToNextLevel(currentPoints) : null;
  const earnedBadges = badges.filter((b) => b.earned);

  const handleRedeem = async (reward: RewardItem) => {
    setRedeeming(true);
    try {
      const result = await redemptionService.redeem(reward);
      setRedeemSuccess(result);
      setCurrentPoints((prev) => prev - reward.points_cost);
      showToast(`Successfully redeemed ${reward.title}!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err?.message ?? 'Redemption failed', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const categoryColors: Record<string, string> = {
    voucher: 'from-blue-500 to-cyan-500',
    badge: 'from-amber-500 to-orange-500',
    donation: 'from-emerald-500 to-green-600',
    merchandise: 'from-purple-500 to-indigo-500',
  };

  return (
    <DashboardLayout>
      {/* Level & Points Overview */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getLevelColor(user?.level ?? 'Bronze')} flex items-center justify-center shadow-lg`}>
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Current Level</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.level}</h2>
            </div>
          </div>
          {levelProgress && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">{currentPoints.toLocaleString()} points</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{levelProgress.next} to {levelProgress.nextLevel}</span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress.progress}%` }} transition={{ duration: 1 }} className={`h-full bg-gradient-to-r ${getLevelColor(user?.level ?? 'Bronze')} rounded-full`} />
              </div>
            </>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Available Points</p>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{currentPoints.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Redeem for rewards</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'catalog' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25' : 'glass-card text-slate-600 dark:text-slate-300'}`}
        >
          <Gift className="w-4 h-4 inline mr-2" /> Redeem Rewards
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25' : 'glass-card text-slate-600 dark:text-slate-300'}`}
        >
          <Ticket className="w-4 h-4 inline mr-2" /> Redemption History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'catalog' && (
          <motion.div key="catalog" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>
            ) : catalog.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Gift className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No rewards available right now. Check back soon!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalog.map((reward, i) => {
                  const Icon = REWARD_ICONS[reward.icon] ?? Gift;
                  const canAfford = currentPoints >= reward.points_cost;
                  const outOfStock = reward.stock !== -1 && reward.stock <= 0;
                  return (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="glass-card glass-card-hover p-5 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[reward.category] ?? 'from-blue-500 to-emerald-500'} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 capitalize">{reward.category}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{reward.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex-1">{reward.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                          <Coins className="w-4 h-4" /> {reward.points_cost.toLocaleString()}
                        </span>
                        {outOfStock ? (
                          <span className="text-xs text-red-500 font-medium">Out of stock</span>
                        ) : canAfford ? (
                          <button
                            onClick={() => setRedeemModal(reward)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all active:scale-95"
                          >
                            Redeem
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                            <Lock className="w-3 h-3" /> Need {reward.points_cost - currentPoints}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-slate-200/60 dark:border-slate-700/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Redemptions</h3>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
              ) : redemptions.length === 0 ? (
                <div className="p-8 text-center">
                  <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">You haven't redeemed any rewards yet.</p>
                  <button onClick={() => setActiveTab('catalog')} className="btn-secondary mt-4">Browse Rewards</button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {redemptions.map((redemption, i) => (
                    <motion.div key={redemption.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{redemption.reward_title}</p>
                        <p className="text-xs text-slate-400">{timeAgo(redemption.created_at)}</p>
                      </div>
                      {redemption.redemption_code && (
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Code</p>
                          <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{redemption.redemption_code}</p>
                        </div>
                      )}
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">-{redemption.points_spent}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badges section */}
      <div className="glass-card p-6 mt-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Badges ({earnedBadges.length}/{badges.length})</h3>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {badges.map((badge, i) => {
              const Icon = BADGE_ICONS[badge.icon] ?? Award;
              return (
                <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className={`p-4 rounded-2xl text-center ${badge.earned ? 'glass-card-hover bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5' : 'bg-slate-50 dark:bg-slate-800/30 opacity-50'}`}>
                  <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${badge.earned ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <Icon className={`w-7 h-7 ${badge.earned ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <p className={`text-sm font-semibold ${badge.earned ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{badge.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{badge.description}</p>
                  {badge.earned && badge.earnedAt && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">Earned {new Date(badge.earnedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reward History (points earned) */}
      <div className="glass-card p-6 mt-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Points Earned History</h3>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        ) : (
          <div className="space-y-2">
            {rewards.map((reward, i) => (
              <motion.div key={reward.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{reward.title}</p>
                  <p className="text-xs text-slate-400">{timeAgo(reward.timestamp)}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{reward.points}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Redeem Confirmation Modal */}
      <Modal isOpen={!!redeemModal} onClose={() => { setRedeemModal(null); setRedeemSuccess(null); }} title={redeemSuccess ? 'Redemption Successful!' : 'Confirm Redemption'} size="sm">
        {redeemModal && !redeemSuccess && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryColors[redeemModal.category] ?? 'from-blue-500 to-emerald-500'} flex items-center justify-center`}>
                {(() => { const Icon = REWARD_ICONS[redeemModal.icon] ?? Gift; return <Icon className="w-7 h-7 text-white" />; })()}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{redeemModal.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{redeemModal.description}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">Cost</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1"><Coins className="w-4 h-4" /> {redeemModal.points_cost.toLocaleString()} pts</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">After redemption</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{(currentPoints - redeemModal.points_cost).toLocaleString()} pts</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRedeemModal(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => handleRedeem(redeemModal)} disabled={redeeming} className="btn-primary flex-1 disabled:opacity-50">
                {redeeming ? 'Processing...' : 'Confirm Redeem'}
              </button>
            </div>
          </div>
        )}
        {redeemSuccess && (
          <div className="text-center py-4 space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-500" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reward Redeemed!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{redeemSuccess.reward_title}</p>
            </div>
            {redeemSuccess.redemption_code && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <p className="text-xs text-slate-400 mb-1">Your Redemption Code</p>
                <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider">{redeemSuccess.redemption_code}</p>
                <p className="text-xs text-slate-400 mt-2">Save this code — you'll need it to claim your reward.</p>
              </div>
            )}
            <button onClick={() => { setRedeemModal(null); setRedeemSuccess(null); }} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
