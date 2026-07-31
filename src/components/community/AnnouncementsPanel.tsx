import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Pin, Plus, Trash2, X } from 'lucide-react';
import type { CommunityAnnouncement } from '@/types';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { timeAgo } from '@/utils/helpers';

export function AnnouncementsPanel() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', body: '', pinned: true });

  const isAdmin = user?.role === 'admin';

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await communityService.getAnnouncements();
      setAnnouncements(data);
    } catch { showToast('Failed to load announcements', 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!newAnn.title.trim() || !newAnn.body.trim()) { showToast('Title and body are required', 'warning'); return; }
    try {
      const created = await communityService.createAnnouncement(user.id, newAnn);
      setAnnouncements((prev) => [created, ...prev]);
      setCreateOpen(false);
      setNewAnn({ title: '', body: '', pinned: true });
      showToast('Announcement published', 'success');
    } catch (err: any) { showToast('Failed to create announcement: ' + err.message, 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await communityService.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast('Announcement deleted', 'success');
    } catch { showToast('Failed to delete', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Announcements</h3>
        {isAdmin && <button onClick={() => setCreateOpen(true)} className="btn-primary !py-2 !px-4 !text-sm"><Plus className="w-4 h-4" /> New Announcement</button>}
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="glass-card p-5 h-32 animate-pulse" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"><Megaphone className="w-8 h-8 text-slate-400" /></div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No announcements</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">{isAdmin ? 'Publish an announcement to notify the community.' : 'Check back later for official announcements.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, i) => (
            <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass-card p-5 ${ann.pinned ? 'ring-2 ring-blue-400/50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {ann.pinned && <Pin className="w-4 h-4 text-blue-500" />}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center"><Megaphone className="w-5 h-5 text-white" /></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ann.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">by {ann.authorName} · {timeAgo(ann.createdAt)}</p>
                  </div>
                </div>
                {isAdmin && <button onClick={() => handleDelete(ann.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-3 whitespace-pre-wrap">{ann.body}</p>
            </motion.div>
          ))}
        </div>
      )}

      {isAdmin && (
        <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Announcement">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Title</label>
              <input value={newAnn.title} onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })} className="input-field" placeholder="Announcement title" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Body</label>
              <textarea value={newAnn.body} onChange={(e) => setNewAnn({ ...newAnn, body: e.target.value })} rows={4} className="input-field resize-none" placeholder="Announcement details..." />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={newAnn.pinned} onChange={(e) => setNewAnn({ ...newAnn, pinned: e.target.checked })} className="w-4 h-4 rounded" />
              Pin this announcement
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Publish</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
