import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, MapPin, Hash, Calendar, Image, Video, FileText, BarChart3 } from 'lucide-react';
import type { CommunityPost, AdvancedSearchFilters } from '@/types';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PostCard } from './PostCard';

export function AdvancedSearchPanel() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<AdvancedSearchFilters>({ query: '', mediaType: 'any' });
  const [results, setResults] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    if (!user) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await communityService.advancedSearch(filters, user.id);
      setResults(data);
    } catch { showToast('Search failed', 'error'); }
    finally { setLoading(false); }
  };

  const handlePostUpdate = (updated: CommunityPost) => setResults((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  const handlePostDelete = (postId: string) => setResults((prev) => prev.filter((p) => p.id !== postId));

  const hasActiveFilters = filters.location || filters.hashtag || (filters.mediaType && filters.mediaType !== 'any') || filters.dateFrom || filters.dateTo || filters.hasPoll;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Advanced Search</h3>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filters.query ?? ''}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search posts by text..."
            className="input-field !pl-10"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary !px-3 ${showFilters || hasActiveFilters ? '!bg-blue-100 dark:!bg-blue-500/20' : ''}`}>
          <Filter className="w-4 h-4" />
        </button>
        <button onClick={handleSearch} disabled={loading} className="btn-primary !px-4">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</label>
              <input value={filters.location ?? ''} onChange={(e) => setFilters({ ...filters, location: e.target.value })} className="input-field !py-2 !text-sm" placeholder="City or area" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block flex items-center gap-1"><Hash className="w-3 h-3" /> Hashtag</label>
              <input value={filters.hashtag ?? ''} onChange={(e) => setFilters({ ...filters, hashtag: e.target.value.replace('#', '') })} className="input-field !py-2 !text-sm" placeholder="tag name" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> From Date</label>
              <input type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="input-field !py-2 !text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> To Date</label>
              <input type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="input-field !py-2 !text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Media Type</label>
            <div className="flex items-center gap-2">
              {[
                { id: 'any', label: 'Any', icon: Filter },
                { id: 'image', label: 'Images', icon: Image },
                { id: 'video', label: 'Videos', icon: Video },
                { id: 'document', label: 'Docs', icon: FileText },
              ].map((m) => (
                <button key={m.id} onClick={() => setFilters({ ...filters, mediaType: m.id as any })} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${(filters.mediaType ?? 'any') === m.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  <m.icon className="w-3.5 h-3.5" />{m.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={filters.hasPoll ?? false} onChange={(e) => setFilters({ ...filters, hasPoll: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Only posts with polls</span>
          </label>
          {hasActiveFilters && (
            <button onClick={() => setFilters({ query: '', mediaType: 'any' })} className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all filters
            </button>
          )}
        </motion.div>
      )}

      {/* Results */}
      {searched && (
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {loading ? 'Searching...' : `${results.length} ${results.length === 1 ? 'result' : 'results'} found`}
          </p>
          {results.length === 0 && !loading ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-slate-400" /></div>
              <p className="text-sm text-slate-500 dark:text-slate-400">No posts match your filters. Try adjusting your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((post) => <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} onDelete={handlePostDelete} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
