import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, AlertCircle, Play, Pause, MapPin, Globe, Gauge, Languages, FileText, Building2, X } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { PageLoader } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/StatCard';

interface VoiceComplaintRow {
  id: string;
  reporter_id: string | null;
  audio_url: string | null;
  detected_language: string | null;
  original_transcript: string | null;
  english_translation: string | null;
  confidence: number | null;
  category: string | null;
  severity: string | null;
  department: string | null;
  priority_score: number | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  created_at: string;
}

const severityStyle: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
};

export function AdminVoiceComplaintsPanel() {
  const [complaints, setComplaints] = useState<VoiceComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<VoiceComplaintRow | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('voice_complaints')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw new Error(fetchError.message);
      setComplaints((data ?? []) as VoiceComplaintRow[]);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load voice complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const toggleAudio = (row: VoiceComplaintRow) => {
    const audioEl = audioRef.current;
    if (!audioEl || !row.audio_url) return;
    if (playingId === row.id) {
      audioEl.pause();
      setPlayingId(null);
    } else {
      audioEl.src = row.audio_url;
      audioEl.play().catch(() => setError('Failed to play audio'));
      setPlayingId(row.id);
    }
  };

  return (
    <div className="space-y-4">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} hidden />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Voice Complaints</h2>
          <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{complaints.length}</span>
        </div>
        <button onClick={loadComplaints} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Refresh</button>
      </div>

      {loading && <PageLoader />}
      {error && !loading && (
        <ErrorState title="Failed to load" message={error} onRetry={loadComplaints} />
      )}
      {!loading && !error && complaints.length === 0 && (
        <EmptyState icon={Mic} title="No voice complaints yet" description="Voice complaints submitted by citizens will appear here with their English translation." />
      )}

      {/* List */}
      {!loading && !error && complaints.length > 0 && (
        <div className="space-y-3">
          {complaints.map((row, idx) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="glass-card p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(row)}
            >
              <div className="flex items-start gap-3">
                {/* Audio play button */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAudio(row); }}
                  className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 hover:bg-blue-700 transition-colors"
                  aria-label={playingId === row.id ? 'Pause audio' : 'Play audio'}
                >
                  {playingId === row.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {row.english_translation?.slice(0, 70) ?? 'No translation'}{row.english_translation && row.english_translation.length > 70 ? '...' : ''}
                    </span>
                    {row.severity && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityStyle[row.severity] ?? severityStyle.low}`}>
                        {row.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                    {row.detected_language && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {row.detected_language}</span>}
                    {row.category && <span className="capitalize">{row.category.replace(/-/g, ' ')}</span>}
                    {row.department && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {row.department}</span>}
                    {row.priority_score != null && <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {row.priority_score}/100</span>}
                    <span>{new Date(row.created_at).toLocaleDateString('en-IN', { day: 'short', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between z-10">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Voice Complaint
                </h3>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Audio player */}
                {selected.audio_url && (
                  <div className="glass-card p-4">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Original Audio</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleAudio(selected)}
                        className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                      >
                        {playingId === selected.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{playingId === selected.id ? 'Playing...' : 'Tap to play'}</span>
                    </div>
                  </div>
                )}

                {/* Language + confidence */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-slate-400 uppercase">Language</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{selected.detected_language ?? 'N/A'}</p>
                  </div>
                  <div className="glass-card p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-slate-400 uppercase">Confidence</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selected.confidence != null ? `${Math.round(selected.confidence * 100)}%` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Original transcript */}
                {selected.original_transcript && (
                  <div className="glass-card p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Original Transcript ({selected.detected_language})</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{selected.original_transcript}</p>
                  </div>
                )}

                {/* English translation */}
                {selected.english_translation && (
                  <div className="glass-card p-4 border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Languages className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">English Translation</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{selected.english_translation}</p>
                  </div>
                )}

                {/* Classification */}
                <div className="glass-card p-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">AI Classification</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Category</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{selected.category?.replace(/-/g, ' ') ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Severity</p>
                      {selected.severity && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${severityStyle[selected.severity] ?? severityStyle.low}`}>
                          {selected.severity.charAt(0).toUpperCase() + selected.severity.slice(1)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Department</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{selected.department ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Priority</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{selected.priority_score ?? 'N/A'}/100</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {selected.address && (
                  <div className="glass-card p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Location</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{selected.address}{selected.city ? `, ${selected.city}` : ''}</p>
                    {selected.lat != null && selected.lng != null && (
                      <p className="text-xs text-slate-400 mt-1">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</p>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-slate-400 text-center">
                  Submitted on {new Date(selected.created_at).toLocaleString('en-IN')}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
