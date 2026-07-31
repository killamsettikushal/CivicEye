import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, CheckCircle2, RotateCcw, Mic } from 'lucide-react';

interface VoiceComplaintPanelProps {
  recorded: boolean;
  loading: boolean;
  error: string | null;
  onRerecord: () => void;
}

/**
 * Displays the state of a locally-recorded voice note.
 * No AI transcription/translation is performed — audio is stored as-is.
 */
export function VoiceComplaintPanel({ recorded, loading, error, onRerecord }: VoiceComplaintPanelProps) {
  return (
    <div className="space-y-4">
      {/* Loading state — only local audio finalization */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 flex flex-col items-center gap-3"
          >
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Saving your voice note...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-start gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Recording Error</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error}</p>
              <button onClick={onRerecord} className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recorded confirmation */}
      <AnimatePresence>
        {recorded && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Voice note saved</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Audio recording attached</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Please type your complaint below so officers can read it. Your audio note is kept as supporting evidence.
                  </p>
                </div>
                <button
                  onClick={onRerecord}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 flex-shrink-0"
                >
                  <RotateCcw className="w-3 h-3" /> Re-record
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
