import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Heart, MessageCircle, AtSign, Users, BarChart3, Megaphone, Calendar, Mail } from 'lucide-react';
import type { NotificationPrefs } from '@/types';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const PREF_ITEMS: { key: keyof NotificationPrefs; label: string; description: string; icon: typeof Bell }[] = [
  { key: 'notifyLikes', label: 'Likes', description: 'When someone likes your post', icon: Heart },
  { key: 'notifyComments', label: 'Comments', description: 'When someone comments on your post', icon: MessageCircle },
  { key: 'notifyMentions', label: 'Mentions', description: 'When someone mentions you', icon: AtSign },
  { key: 'notifyFollows', label: 'Follows', description: 'When someone follows you', icon: Users },
  { key: 'notifyPollResults', label: 'Poll Results', description: 'When a poll you voted in ends', icon: BarChart3 },
  { key: 'notifyAnnouncements', label: 'Announcements', description: 'Official community announcements', icon: Megaphone },
  { key: 'notifyEvents', label: 'Events', description: 'New events in your area', icon: Calendar },
  { key: 'notifyGroupUpdates', label: 'Group Updates', description: 'Updates in groups you joined', icon: Users },
];

export function NotificationPrefsPanel() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) loadPrefs(); }, [user]);

  const loadPrefs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await communityService.getNotificationPrefs(user.id);
      setPrefs(data);
    } catch { showToast('Failed to load preferences', 'error'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (key: keyof NotificationPrefs) => {
    if (!prefs || !user) return;
    const newValue = !prefs[key];
    setPrefs({ ...prefs, [key]: newValue });
    setSaving(true);
    try {
      await communityService.updateNotificationPrefs(user.id, { [key]: newValue });
      showToast('Preference updated', 'success');
    } catch { showToast('Failed to update', 'error'); setPrefs({ ...prefs, [key]: !newValue }); }
    finally { setSaving(false); }
  };

  if (loading || !prefs) {
    return <div className="glass-card p-6 h-64 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
      <div className="glass-card p-5 space-y-1">
        {PREF_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${prefs[item.key] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md ${prefs[item.key] ? 'left-5' : 'left-0.5'}`}
                />
              </button>
            </div>
          );
        })}
        {/* Email digest */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Mail className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" /></div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Email Digest</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Weekly summary of community activity</p>
            </div>
          </div>
          <button onClick={() => handleToggle('emailDigest')} className={`relative w-11 h-6 rounded-full transition-colors ${prefs.emailDigest ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
            <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md ${prefs.emailDigest ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
