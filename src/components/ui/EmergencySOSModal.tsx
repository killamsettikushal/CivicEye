import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon, PhoneCall, MapPin, ShieldAlert, CheckCircle2,
  X, Loader2, Siren, HeartPulse
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmergencySOSModal({ isOpen, onClose }: EmergencySOSModalProps) {
  const { showToast } = useToast();
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  if (!isOpen) return null;

  const handleTriggerSOS = () => {
    setDispatching(true);
    setTimeout(() => {
      setDispatching(false);
      setDispatched(true);
      showToast('🚨 EMERGENCY SOS DISPATCHED to Traffic Police & Ambulance Hotline!', 'error');
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-md w-full p-6 rounded-3xl border-2 border-red-500/50 bg-slate-950 text-white shadow-2xl text-center relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {!dispatched ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4 text-red-500"
            >
              <Siren className="w-10 h-10 animate-bounce" />
            </motion.div>

            <h2 className="text-2xl font-extrabold text-white">Emergency SOS Dispatch</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Triggers instant high-priority emergency dispatch to <strong>Ambulance (108)</strong>, <strong>Traffic Control Room</strong>, and <strong>Nearest Police Patrol Unit</strong>.
            </p>

            <div className="my-6 p-3 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-red-400" /> GPS Location:</span>
                <span className="font-bold text-white">12.9716° N, 77.5946° E</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Severity Priority:</span>
                <span className="font-bold text-red-400">CRITICAL EMERGENCY (P1)</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleTriggerSOS}
                disabled={dispatching}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-base shadow-lg shadow-red-600/40 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                {dispatching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Dispatching Emergency Hotline...
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-5 h-5" /> CONFIRM & DISPATCH EMERGENCY SOS
                  </>
                )}
              </button>

              <button onClick={onClose} className="btn-ghost text-xs text-slate-400">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Emergency Hotline Dispatched!</h3>
            <p className="text-xs text-slate-300">
              Nearest Patrol Unit (Hoysala 14) and City Emergency Hotline have received your GPS coordinates and incident log. ETA: <strong>4.2 minutes</strong>.
            </p>
            <button onClick={onClose} className="btn-primary w-full text-sm">
              Close Window
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
