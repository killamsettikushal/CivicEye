import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, CheckCircle2, Copy, Check, ArrowRight, AlertCircle, KeyRound, User } from 'lucide-react';

export function RegistrationSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const username = (location.state as { username?: string })?.username ?? '';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = username;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [shouldRedirect, setShouldRedirect] = useState(!username);

  useEffect(() => {
    if (!username) {
      console.log('[RegistrationSuccessPage] No username in state, redirecting to /register');
      navigate('/register', { replace: true });
    }
  }, [username, navigate]);

  if (shouldRedirect || !username) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><p className="text-sm text-slate-400">Redirecting...</p></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-300/20 dark:bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300/20 dark:bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-lg relative"
      >
        <Link to="/" className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">CivicEye<span className="text-blue-600 dark:text-blue-400"> AI</span></span>
        </Link>

        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account Created Successfully</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Your account has been registered. Below is your permanent username — save it now, you'll need it for every login.
          </p>
        </div>

        {/* Username display card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-500/10 dark:to-emerald-500/10 border-2 border-blue-200 dark:border-blue-500/20 mb-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">Your Permanent Username</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-bold tracking-wider text-slate-900 dark:text-white font-mono">{username}</p>
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 ${copied ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
        </motion.div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 mb-6">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            This username is permanent and cannot be changed. You will use it instead of your email to sign in. Write it down or take a screenshot.
          </p>
        </div>

        <div className="space-y-3">
          <Link to="/login" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            Proceed to Login <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => navigator.clipboard.writeText(`${username}`)}
            className="btn-ghost w-full py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" /> Copy Username Again
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Your username follows a government-style identification format for security and uniqueness.
        </p>
      </motion.div>
    </div>
  );
}
