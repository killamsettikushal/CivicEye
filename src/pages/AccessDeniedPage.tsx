import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Home, LogIn } from 'lucide-react';

export function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-300/20 dark:bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-300/20 dark:bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md relative text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
          <ShieldAlert className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-8">
          You are not authorized to access the Admin Portal. This area is restricted to pre-authorized municipal administrator accounts.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-ghost flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link to="/login" className="btn-primary flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Citizen Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
