import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Video, FileText, MapPin, X, Plus,
  BarChart3, Clock, Trash2, Send, Calendar, Save, Users, Landmark,
} from 'lucide-react';
import type { CommunityMedia, CommunityGroup, LinkPreview } from '@/types';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getInitials } from '@/utils/helpers';

interface PostComposerProps {
  onPosted: () => void;
  groups?: CommunityGroup[];
}

const POLL_DURATIONS = [
  { label: '1 hour', hours: 1 },
  { label: '6 hours', hours: 6 },
  { label: '24 hours', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
];

export function PostComposer({ onPosted, groups = [] }: PostComposerProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [landmark, setLandmark] = useState('');
  const [media, setMedia] = useState<CommunityMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState(24);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [savingDraft, setSavingDraft] = useState(false);
  const fileImageRef = useRef<HTMLInputElement>(null);
  const fileVideoRef = useRef<HTMLInputElement>(null);
  const fileDocRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: CommunityMedia[] = [];
      for (const file of files) {
        const result = await communityService.uploadMedia(file, user.id);
        uploaded.push(result);
      }
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      showToast('Failed to upload file: ' + (err.message ?? 'unknown error'), 'error');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeMedia = (index: number) => setMedia((prev) => prev.filter((_, i) => i !== index));

  const addPollOption = () => {
    if (pollOptions.length >= 6) { showToast('Maximum 6 options allowed', 'warning'); return; }
    setPollOptions((prev) => [...prev, '']);
  };
  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };
  const updatePollOption = (index: number, value: string) =>
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));

  const extractLinkPreview = async (): Promise<LinkPreview | null> => {
    const urlMatch = body.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) return null;
    const url = urlMatch[0];
    try {
      return await communityService.fetchLinkPreview(url);
    } catch { return null; }
  };

  const resetForm = () => {
    setBody(''); setLocation(''); setLandmark(''); setMedia([]);
    setShowPoll(false); setPollQuestion(''); setPollOptions(['', '']); setPollDuration(24);
    setShowSchedule(false); setScheduledAt(''); setSelectedGroup('');
  };

  const handlePost = async () => {
    if (!body.trim() && media.length === 0) { showToast('Please write something or add media', 'warning'); return; }
    if (showPoll) {
      const validOptions = pollOptions.filter((o) => o.trim());
      if (validOptions.length < 2) { showToast('Poll needs at least 2 options', 'warning'); return; }
    }

    setPosting(true);
    try {
      const expiresAt = showPoll ? new Date(Date.now() + pollDuration * 60 * 60 * 1000).toISOString() : null;
      const scheduled = showSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : null;
      const linkPreview = await extractLinkPreview();

      await communityService.createPost(user.id, {
        body: body.trim(),
        media,
        locationName: location.trim() || undefined,
        landmark: landmark.trim() || undefined,
        groupId: selectedGroup || null,
        scheduledAt: scheduled,
        linkPreview,
        poll: showPoll ? { question: pollQuestion.trim(), options: pollOptions.filter((o) => o.trim()), expiresAt } : null,
      });
      resetForm();
      onPosted();
      showToast(scheduled ? 'Post scheduled' : 'Post published to the community', 'success');
    } catch (err: any) {
      showToast('Failed to publish post: ' + (err.message ?? 'unknown error'), 'error');
    } finally { setPosting(false); }
  };

  const handleSaveDraft = async () => {
    if (!body.trim() && media.length === 0) { showToast('Nothing to save', 'warning'); return; }
    setSavingDraft(true);
    try {
      await communityService.saveDraft(user.id, {
        body: body.trim(),
        media,
        locationName: location.trim(),
        landmark: landmark.trim(),
        pollData: showPoll ? { question: pollQuestion, options: pollOptions, duration: pollDuration } : null,
        groupId: selectedGroup || null,
        scheduledAt: showSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      showToast('Draft saved', 'success');
    } catch (err: any) {
      showToast('Failed to save draft', 'error');
    } finally { setSavingDraft(false); }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
          {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : getInitials(user.name)}
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Share a civic issue, update, or question with your community..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none text-sm leading-relaxed"
            maxLength={2000}
          />

          {/* Location + Landmark */}
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="flex items-center gap-2 flex-1">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Landmark className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark" className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none" />
            </div>
          </div>

          {/* Group selector */}
          {groups.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 focus:outline-none">
                <option value="">Post to public feed</option>
                {groups.filter((g) => g.isMember).map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Media previews */}
          {media.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {media.map((m, i) => (
                <div key={i} className="relative group">
                  {m.type === 'image' ? <img src={m.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    : m.type === 'video' ? <div className="w-20 h-20 rounded-lg bg-slate-800 flex items-center justify-center"><Video className="w-6 h-6 text-white" /></div>
                    : <div className="w-20 h-20 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><FileText className="w-6 h-6 text-blue-500" /></div>}
                  <button onClick={() => removeMedia(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Poll creator */}
          <AnimatePresence>
            {showPoll && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400"><BarChart3 className="w-4 h-4" /> Create Poll</span>
                  <button onClick={() => setShowPoll(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>
                </div>
                <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question (optional)" className="input-field !py-2 !text-sm" />
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={opt} onChange={(e) => updatePollOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="input-field !py-2 !text-sm flex-1" maxLength={80} />
                      {pollOptions.length > 2 && <button onClick={() => removePollOption(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                  {pollOptions.length < 6 && <button onClick={addPollOption} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"><Plus className="w-4 h-4" /> Add option</button>}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <select value={pollDuration} onChange={(e) => setPollDuration(Number(e.target.value))} className="input-field !py-1.5 !text-sm !w-auto">
                    {POLL_DURATIONS.map((d) => (<option key={d.hours} value={d.hours}>{d.label}</option>))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Schedule */}
          <AnimatePresence>
            {showSchedule && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400"><Calendar className="w-4 h-4" /> Schedule Post</span>
                  <button onClick={() => { setShowSchedule(false); setScheduledAt(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>
                </div>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input-field !py-2 !text-sm" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <input ref={fileImageRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              <input ref={fileVideoRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
              <input ref={fileDocRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileImageRef.current?.click()} disabled={uploading} className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Add image"><ImageIcon className="w-5 h-5" /></button>
              <button onClick={() => fileVideoRef.current?.click()} disabled={uploading} className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Add video"><Video className="w-5 h-5" /></button>
              <button onClick={() => fileDocRef.current?.click()} disabled={uploading} className="p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors" title="Add document"><FileText className="w-5 h-5" /></button>
              <button onClick={() => setShowPoll(!showPoll)} className={`p-2 rounded-lg transition-colors ${showPoll ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Create poll"><BarChart3 className="w-5 h-5" /></button>
              <button onClick={() => setShowSchedule(!showSchedule)} className={`p-2 rounded-lg transition-colors ${showSchedule ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Schedule post"><Calendar className="w-5 h-5" /></button>
              {uploading && <span className="text-xs text-slate-400 ml-1">Uploading...</span>}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">{body.length}/2000</span>
              <button onClick={handleSaveDraft} disabled={savingDraft || (!body.trim() && media.length === 0)} className="btn-ghost !py-2 !px-3 !text-sm" title="Save as draft">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={handlePost} disabled={posting || uploading || (!body.trim() && media.length === 0)} className="btn-primary !py-2 !px-4 !text-sm">
                {posting ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {showSchedule && scheduledAt ? 'Scheduling...' : 'Posting...'}</span>
                ) : (
                  <span className="flex items-center gap-2"><Send className="w-4 h-4" /> {showSchedule && scheduledAt ? 'Schedule' : 'Post'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
