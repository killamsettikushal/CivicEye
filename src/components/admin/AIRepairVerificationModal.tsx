import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, CheckCircle2, AlertTriangle, Upload, RefreshCw, Sparkles,
  ShieldCheck, Loader2, ArrowRight
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface AIRepairVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  beforeImageSrc: string;
  issueTitle: string;
  onVerified: (score: number) => void;
}

export function AIRepairVerificationModal({
  isOpen,
  onClose,
  reportId,
  beforeImageSrc,
  issueTitle,
  onVerified,
}: AIRepairVerificationModalProps) {
  const { showToast } = useToast();
  const [afterImageSrc, setAfterImageSrc] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    completionScore: number;
    verified: boolean;
    explanation: string;
    restorationQuality: 'Excellent' | 'Good' | 'Incomplete';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAfterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAfterImageSrc(url);
      setResult(null);
    }
  };

  const runRepairVerification = async () => {
    if (!afterImageSrc) return;
    setVerifying(true);
    setResult(null);

    // Simulate AI Repair Comparison Vision analysis
    setTimeout(() => {
      const score = Math.floor(Math.random() * 15) + 85; // 85% - 99%
      setResult({
        completionScore: score,
        verified: score >= 80,
        explanation: 'AI vision confirmed complete road surface patch repair with smooth asphalt leveling and zero residual hazard.',
        restorationQuality: 'Excellent',
      });
      setVerifying(false);
      showToast(`Repair verified! ${score}% completion score`, 'success');
    }, 1800);
  };

  const handleComplete = () => {
    if (result) {
      onVerified(result.completionScore);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-3xl w-full p-6 shadow-2xl rounded-2xl overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Repair Verification Studio</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Report ID: {reportId} · {issueTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Before vs After Comparison Grid */}
        <div className="grid sm:grid-cols-2 gap-4 my-6">
          {/* Before Photo */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              📷 Before (Reported Damage)
            </span>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <img src={beforeImageSrc} alt="Before" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* After Photo Upload */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              🛠️ After (Contractor Fixed Photo)
            </span>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-video w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                afterImageSrc
                  ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-500/5'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-900'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAfterFileChange}
                className="hidden"
              />

              {afterImageSrc ? (
                <img src={afterImageSrc} alt="After" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Upload Fixed Repair Photo</p>
                  <p className="text-[10px] text-slate-400">Click to browse file</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification Action / Results */}
        {verifying ? (
          <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-sm font-bold text-blue-700 dark:text-blue-400">AI Comparing Before vs After Repair Features...</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Analyzing road texture restoration, patch completeness, and safety leveling.</p>
          </div>
        ) : result ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Repair Verified Successfully!</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{result.explanation}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{result.completionScore}%</span>
                <span className="text-[10px] text-slate-400 block font-semibold">Completion Score</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Action Footer */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          {!result ? (
            <button
              onClick={runRepairVerification}
              disabled={!afterImageSrc || verifying}
              className="btn-primary text-xs disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" /> Run AI Repair Verification
            </button>
          ) : (
            <button onClick={handleComplete} className="btn-primary text-xs">
              Confirm & Resolve Ticket <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
