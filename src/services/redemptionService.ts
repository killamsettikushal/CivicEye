import { supabase } from '@/services/supabaseClient';
import type { RewardItem, Redemption } from '@/types';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CIVIC-';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const redemptionService = {
  async getRewards(): Promise<RewardItem[]> {
    const { data, error } = await supabase
      .from('rewards_catalog')
      .select('*')
      .eq('active', true)
      .order('points_cost', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getRedemptions(): Promise<Redemption[]> {
    const { data, error } = await supabase
      .from('redemptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async redeem(reward: RewardItem): Promise<Redemption> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error('Profile not found');
    if (profile.points < reward.points_cost) {
      throw new Error('Insufficient points for this reward');
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ points: profile.points - reward.points_cost, updated_at: new Date().toISOString() })
      .eq('id', userData.user.id)
      .gte('points', reward.points_cost)
      .select('points')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedProfile) throw new Error('Insufficient points for this reward (concurrent update detected)');

    const redemptionCode = reward.category === 'voucher' || reward.category === 'merchandise' ? generateCode() : null;

    const { data: redemption, error: redeemError } = await supabase
      .from('redemptions')
      .insert({
        user_id: userData.user.id,
        reward_id: reward.id,
        reward_title: reward.title,
        points_spent: reward.points_cost,
        status: 'fulfilled',
        redemption_code: redemptionCode,
      })
      .select()
      .maybeSingle();

    if (redeemError) throw redeemError;
    if (!redemption) throw new Error('Failed to create redemption');
    return redemption;
  },

  async getUserPoints(): Promise<number> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return 0;
    const { data, error } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error || !data) return 0;
    return data.points;
  },

  async updateProfilePoints(pointsToAdd: number): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userData.user.id);
    if (error) return;
    // Use RPC for atomic increment; fall back to client-side if RPC unavailable
    const { error: rpcError } = await supabase.rpc('increment_profile_points', {
      p_user_id: userData.user.id,
      p_amount: pointsToAdd,
    });
    if (rpcError) {
      // Fallback: direct update (still better than read-modify-write with a stale read)
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (!profile) return;
      await supabase
        .from('profiles')
        .update({ points: profile.points + pointsToAdd, updated_at: new Date().toISOString() })
        .eq('id', userData.user.id);
    }
  },
};

export interface AdminRedemptionRow {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  reward_id: string;
  reward_title: string;
  points_spent: number;
  status: string;
  redemption_code: string | null;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalRedeemed: number;
  totalRemaining: number;
  totalPointsSpent: number;
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const [profilesRes, redemptionsRes, catalogRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: false }),
      supabase.from('redemptions').select('id, points_spent', { count: 'exact', head: false }),
      supabase.from('rewards_catalog').select('stock', { count: 'exact', head: false }),
    ]);

    const totalUsers = profilesRes.count ?? 0;
    const totalRedeemed = redemptionsRes.count ?? 0;
    const totalPointsSpent = (redemptionsRes.data ?? []).reduce((sum, r) => sum + (r.points_spent ?? 0), 0);

    const catalog = catalogRes.data ?? [];
    const totalRemaining = catalog.reduce((sum, r) => {
      if (r.stock === -1) return sum;
      return sum + r.stock;
    }, 0);

    return { totalUsers, totalRedeemed, totalRemaining, totalPointsSpent };
  },

  async getAllRedemptions(): Promise<AdminRedemptionRow[]> {
    const { data: redemptions, error: redErr } = await supabase
      .from('redemptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (redErr) throw redErr;
    if (!redemptions || redemptions.length === 0) return [];

    const userIds = [...new Set(redemptions.map((r) => r.user_id))];
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);
    if (profErr) throw profErr;

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return redemptions.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_email: profileMap.get(r.user_id)?.email ?? 'Unknown',
      user_name: profileMap.get(r.user_id)?.full_name ?? 'Unknown',
      reward_id: r.reward_id,
      reward_title: r.reward_title,
      points_spent: r.points_spent,
      status: r.status,
      redemption_code: r.redemption_code,
      created_at: r.created_at,
    }));
  },

  async isAdmin(): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    return profile?.role === 'admin';
  },

  async setAdminRole(userId: string): Promise<void> {
    await supabase
      .from('profiles')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('id', userId);
  },
};
