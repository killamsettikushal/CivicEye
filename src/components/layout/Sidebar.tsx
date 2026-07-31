import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FilePlus, Map, FileText, Award, BarChart3,
  Bell, User, Shield, ShieldCheck, Settings, Eye, X, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const citizenLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Report Issue', path: '/report', icon: FilePlus },
    { label: 'AI Vision Scanner', path: '/ai-analyzer', icon: Eye },
    { label: 'My Reports', path: '/reports', icon: FileText },
    { label: 'Live Map', path: '/map', icon: Map },
    { label: 'Rewards', path: '/rewards', icon: Award },
    { label: 'Leaderboard', path: '/leaderboard', icon: BarChart3 },
    { label: 'Community', path: '/community', icon: Users },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const adminLinks = [
    { label: 'Admin Dashboard', path: '/admin', icon: Shield },
    { label: 'Admin Portal', path: '/admin/portal', icon: ShieldCheck },
    { label: 'AI Vision Scanner', path: '/ai-analyzer', icon: Eye },
    { label: 'All Reports', path: '/reports', icon: FileText },
    { label: 'Live Map', path: '/map', icon: Map },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Leaderboard', path: '/leaderboard', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const links = isAdmin ? adminLinks : citizenLinks;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900 dark:text-white">CivicEye<span className="text-blue-600 dark:text-blue-400"> AI</span></span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}


        </nav>

        {user && !isAdmin && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="glass-card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.level} · {user.points} pts</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
