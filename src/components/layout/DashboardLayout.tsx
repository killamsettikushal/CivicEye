import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, Bell, Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/report': 'Report an Issue',
  '/reports': 'Reports',
  '/map': 'Live Map',
  '/rewards': 'Rewards & Badges',
  '/leaderboard': 'Leaderboard',
  '/community': 'Community',
  '/analytics': 'Analytics',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/admin': 'Admin Dashboard',
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 h-16 glass-card !rounded-none !border-x-0 !border-t-0 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Menu className="w-5 h-5" />
            </button>
            <motion.h1
              key={location.pathname}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {title}
            </motion.h1>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/search" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-48">
              <Search className="w-4 h-4" />
              <span>Search...</span>
            </Link>
            <Link to="/notifications" className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <Link to="/report" className="hidden sm:inline-flex btn-primary !py-2 !px-4 text-sm">
              <span>Report Issue</span>
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
