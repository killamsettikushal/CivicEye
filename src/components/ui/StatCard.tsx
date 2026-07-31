import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  color?: string;
  delay?: number;
}

export function StatCard({ icon: Icon, label, value, trend, color = 'blue', delay = 0 }: StatCardProps) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-rose-600',
    purple: 'from-purple-500 to-indigo-500',
    cyan: 'from-cyan-500 to-blue-500',
  slate: 'from-slate-500 to-slate-600',
  teal: 'from-teal-500 to-emerald-500',
  indigo: 'from-indigo-500 to-purple-500',
  rose: 'from-rose-500 to-pink-500',
  orange: 'from-orange-500 to-red-500',
  sky: 'from-sky-500 to-blue-500',
  violet: 'from-violet-500 to-purple-500',
    emerald: 'from-emerald-500 to-green-600',
    yellow: 'from-yellow-400 to-amber-500',
    fuchsia: 'from-fuchsia-500 to-purple-600',
    lime: 'from-lime-500 to-green-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4 }}
      className="glass-card glass-card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
          {trend && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">{trend}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color] ?? colorMap.blue} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4">Try Again</button>
      )}
    </motion.div>
  );
}
