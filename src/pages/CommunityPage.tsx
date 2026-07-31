import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Flame, ThumbsUp, MapPin, Users, BarChart3, Search, X,
  Megaphone, Award, Calendar, Settings, Filter, Pin,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PostComposer } from '@/components/community/PostComposer';
import { PostCard } from '@/components/community/PostCard';
import { TrendingSidebar } from '@/components/community/TrendingSidebar';
import { HighlightsSidebar, NearbySidebar } from '@/components/community/HighlightsSidebar';
import { GroupsPanel } from '@/components/community/GroupsPanel';
import { EventsPanel } from '@/components/community/EventsPanel';
import { AnnouncementsPanel } from '@/components/community/AnnouncementsPanel';
import { AchievementsPanel } from '@/components/community/AchievementsPanel';
import { AdvancedSearchPanel } from '@/components/community/AdvancedSearchPanel';
import { NotificationPrefsPanel } from '@/components/community/NotificationPrefsPanel';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { GroupChatPage } from '@/pages/GroupChatPage';
import type { CommunityPost, CommunityFeedFilter, CommunityGroup } from '@/types';

type Tab = 'feed' | 'groups' | 'events' | 'announcements' | 'achievements' | 'search' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: 'feed', label: 'Feed', icon: Clock },
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const FILTERS: { id: CommunityFeedFilter; label: string; icon: typeof Clock }[] = [
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'popular', label: 'Popular', icon: ThumbsUp },
  { id: 'nearby', label: 'Nearby', icon: MapPin },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'polls', label: 'Polls', icon: BarChart3 },
  { id: 'pinned', label: 'Pinned', icon: Pin },
];

export function CommunityPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CommunityFeedFilter>('latest');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [activeChatGroup, setActiveChatGroup] = useState<CommunityGroup | null>(null);

  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await communityService.getFeed(filter, user.id, {
        search: search.trim() || undefined,
        hashtag: activeTag || undefined,
        limit: 30,
      });
      // Filter out muted and blocked posts
      const filtered = data.filter((p) => !p.hasMuted && !p.isBlocked);
      setPosts(filtered);
    } catch { showToast('Failed to load feed', 'error'); }
    finally { setLoading(false); }
  }, [filter, search, activeTag, user]);

  useEffect(() => {
    if (tab === 'feed') loadPosts();
  }, [loadPosts, tab]);

  useEffect(() => {
    if (user && tab === 'feed') {
      communityService.getGroups(user.id).then(setGroups).catch(() => {});
    }
  }, [user, tab]);

  const handlePostUpdate = (updated: CommunityPost) => setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  const handlePostDelete = (postId: string) => setPosts((prev) => prev.filter((p) => p.id !== postId));
  const handleSelectTag = (tag: string) => setActiveTag(tag || null);

  if (!user) return null;

  return (
    <DashboardLayout>
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-emerald-500/5" />
        <div className="relative">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Community</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Share civic issues, join groups, attend events, and earn achievements for your contributions.
          </p>
        </div>
      </motion.div>

      {/* Tab navigation */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25' : 'glass-card !rounded-xl text-slate-600 dark:text-slate-300 hover:border-blue-300/50'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'feed' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts..." className="input-field !pl-10" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>}
            </div>

            {/* Active tag filter */}
            {activeTag && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">#{activeTag}</span>
                <button onClick={() => setActiveTag(null)} className="ml-auto text-blue-500 hover:text-blue-700"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Composer */}
            <PostComposer onPosted={loadPosts} groups={groups} />

            {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              {FILTERS.map((f) => {
                const isActive = filter === f.id;
                return (
                  <button key={f.id} onClick={() => setFilter(f.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25' : 'glass-card !rounded-xl text-slate-600 dark:text-slate-300 hover:border-blue-300/50'}`}>
                    <f.icon className="w-4 h-4" />{f.label}
                  </button>
                );
              })}
            </div>

            {/* Feed */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card p-5">
                    <div className="flex gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"><BarChart3 className="w-8 h-8 text-slate-400" /></div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                  {filter === 'following' ? 'No posts from people you follow' : filter === 'polls' ? 'No polls yet' : filter === 'pinned' ? 'No pinned posts' : activeTag ? `No posts for #${activeTag}` : 'No posts yet'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {filter === 'following' ? 'Follow other citizens to see their posts here.' : 'Be the first to share something with your community.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} onDelete={handlePostDelete} />)}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <TrendingSidebar onSelectTag={handleSelectTag} activeTag={activeTag} />
            <HighlightsSidebar onSelectTag={handleSelectTag} />
            <NearbySidebar />
            {/* Community guidelines */}
            <div className="glass-card p-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Community Guidelines</h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />Be respectful and constructive in discussions.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />Share accurate civic issues with evidence.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />No spam, hate speech, or misinformation.</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />Report inappropriate content to help moderation.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs */}
      {tab === 'groups' && (
        activeChatGroup ? (
          <GroupChatPage group={activeChatGroup} onBack={() => setActiveChatGroup(null)} />
        ) : (
          <GroupsPanel onGroupSelected={(g) => setActiveChatGroup(g)} />
        )
      )}
      {tab === 'events' && <EventsPanel />}
      {tab === 'announcements' && <AnnouncementsPanel />}
      {tab === 'achievements' && <AchievementsPanel />}
      {tab === 'search' && <AdvancedSearchPanel />}
      {tab === 'settings' && <NotificationPrefsPanel />}
    </DashboardLayout>
  );
}
