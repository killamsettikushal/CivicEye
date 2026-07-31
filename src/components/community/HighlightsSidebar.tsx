import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, Flame, Star, MapPin, Calendar } from 'lucide-react';
import type { WeeklyHighlight } from '@/types';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';

interface HighlightsSidebarProps {
  onSelectTag?: (tag: string) => void;
}

export function HighlightsSidebar({ onSelectTag }: HighlightsSidebarProps) {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<WeeklyHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadHighlights();
  }, [user]);

  const loadHighlights = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await communityService.getWeeklyHighlights(user.id);
      setHighlights(data);
    } catch { setHighlights([]); }
    finally { setLoading(false); }
  };

  const getIcon = (type: WeeklyHighlight['type']) => {
    switch (type) {
      case 'top-post': return Star;
      case 'top-contributor': return Award;
      case 'trending-tag': return TrendingUp;
      case 'streak-leader': return Flame;
    }
  };

  const getColor = (type: WeeklyHighlight['type']) => {
    switch (type) {
      case 'top-post': return 'from-amber-400 to-orange-500';
      case 'top-contributor': return 'from-blue-500 to-blue-600';
      case 'trending-tag': return 'from-emerald-500 to-teal-600';
      case 'streak-leader': return 'from-red-500 to-orange-600';
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
          <Award className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Weekly Highlights</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : highlights.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No highlights yet this week.</p>
      ) : (
        <div className="space-y-3">
          {highlights.map((h, i) => {
            const Icon = getIcon(h.type);
            const color = getColor(h.type);
            return (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{h.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{h.subtitle}</p>
                  {h.type === 'trending-tag' && onSelectTag && (
                    <button onClick={() => onSelectTag(h.data.tag)} className="text-xs text-blue-500 hover:underline mt-1">View posts</button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ What's Happening Near You ============

export function NearbySidebar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadNearby();
  }, [user]);

  const loadNearby = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await communityService.getEvents(user.id, 'upcoming');
      // Filter to upcoming events in the next 7 days
      const now = Date.now();
      const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
      const nearby = data.filter((e) => {
        const start = new Date(e.startsAt).getTime();
        return start >= now && start <= weekFromNow;
      }).slice(0, 5);
      setEvents(nearby);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Happening Near You</h3>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No upcoming events this week.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <motion.div key={event.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex flex-col items-center justify-center text-white">
                <span className="text-sm font-bold">{new Date(event.startsAt).getDate()}</span>
                <span className="text-[8px] uppercase">{new Date(event.startsAt).toLocaleString('en-IN', { month: 'short' })}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{event.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{event.locationName || event.city || 'Location TBD'}
                </p>
                <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" />{new Date(event.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
