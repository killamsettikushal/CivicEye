import { motion } from 'framer-motion';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        backgroundSize: '1000px 100%',
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-4 border-blue-200 dark:border-slate-700 border-t-blue-600 rounded-full"
      />
    </div>
  );
}
