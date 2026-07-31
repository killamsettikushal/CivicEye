import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}

export function Drawer({ isOpen, onClose, title, children, wide }: DrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-0 right-0 bottom-0 z-[9998] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto scrollbar-hide`}
          >
            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
