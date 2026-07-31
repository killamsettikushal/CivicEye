import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Hash } from 'lucide-react';
import type { TrendingTopic } from '@/types';
import { communityService } from '@/services/communityService';

interface TrendingSidebarProps {
  onSelectTag: (tag: string) => void;
  activeTag: string | null;
}

export function TrendingSidebar({ onSelectTag, activeTag }: TrendingSidebarProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const data = await communityService.getTrendingTopics(10);
      setTopics(data);
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Trending Topics</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          No trending topics yet. Start posting with hashtags to see trends here.
        </p>
      ) : (
        <div className="space-y-1">
          {topics.map((topic, i) => (
            <motion.button
              key={topic.tag}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelectTag(activeTag === topic.tag ? '' : topic.tag)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                activeTag === topic.tag
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium min-w-0">
                <Hash className="w-4 h-4 flex-shrink-0 opacity-60" />
                <span className="truncate">{topic.tag}</span>
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                {topic.count} {topic.count === 1 ? 'post' : 'posts'}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
