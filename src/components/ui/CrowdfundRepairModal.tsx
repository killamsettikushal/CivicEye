import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Building2, Coins, CheckCircle2, Sparkles, X, ShieldCheck, CreditCard
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface CrowdfundRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  targetAmountRs?: number;
}

export function CrowdfundRepairModal({
  isOpen,
  onClose,
  reportTitle,
  targetAmountRs = 15000,
}: CrowdfundRepairModalProps) {
  const { showToast } = useToast();
  const [raisedAmount, setRaisedAmount] = useState(8500);
  const [customAmount, setCustomAmount] = useState('500');
  const [contributing, setContributing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleContribute = () => {
    setContributing(true);
    setTimeout(() => {
      const added = parseInt(customAmount, 10) || 500;
      setRaisedAmount((prev) => Math.min(targetAmountRs, prev + added));
      setContributing(false);
      setSuccess(true);
      showToast(`Thank you! ₹${added} contributed to ${reportTitle}`, 'success');
    }, 1200);
  };

  const progressPct = Math.min(100, Math.round((raisedAmount / targetAmountRs) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-lg w-full p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {!success ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Community Crowdfunded Repair</h3>
                <p className="text-xs text-slate-400">Neighborhood Repair Micro-Fund & Business CSR</p>
              </div>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-300 truncate">{reportTitle}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target Repair Fund:</span>
                <span className="font-bold text-white">₹{targetAmountRs.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Raised so far:</span>
                <span className="font-bold text-emerald-400">₹{raisedAmount.toLocaleString()} ({progressPct}%)</span>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  className="h-full bg-gradient-to-r from-pink-500 to-emerald-400 rounded-full"
                />
              </div>
            </div>

            {/* Quick Amount Select */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 block">Select Contribution Amount (₹):</span>
              <div className="grid grid-cols-4 gap-2">
                {['200', '500', '1000', '2500'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCustomAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      customAmount === amt
                        ? 'bg-pink-600 text-white border-pink-500'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Or enter custom amount in ₹"
                className="input-field text-xs bg-slate-900 border-slate-800 text-white"
              />

              <button
                onClick={handleContribute}
                disabled={contributing}
                className="btn-primary w-full py-3 text-sm font-bold bg-gradient-to-r from-pink-600 to-rose-600 shadow-lg shadow-pink-600/30"
              >
                {contributing ? 'Processing Contribution...' : `Contribute ₹${customAmount} to Repair Fund`}
              </button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Contribution Received!</h3>
            <p className="text-xs text-slate-300">
              You earned <strong>+50 Civic Karma Points</strong> and a <strong>Community Repair Sponsor Badge</strong>!
            </p>
            <button onClick={onClose} className="btn-primary w-full text-sm">
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
