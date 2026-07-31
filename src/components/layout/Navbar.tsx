import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Menu, X, Moon, Sun, LayoutDashboard, LogOut, User as UserIcon, Bell, Users } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/utils/helpers';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [location]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'AI Vision Scanner', path: '/ai-analyzer' },
    { label: 'Live Map', path: '/map' },
    { label: 'Features', path: '/#features' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass-card !rounded-none !border-x-0 !border-t-0 py-3' : 'bg-transparent py-4'
        }`}
      >
        <div className="section-padding flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">CivicEye<span className="text-blue-600 dark:text-blue-400"> AI</span></span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a key={link.label} href={link.path} className="nav-link">{link.label}</a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(user?.name ?? 'U')}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200">{user?.name?.split(' ')[0]}</span>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 glass-card p-2 shadow-xl"
                    >
                      <div className="px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/50 mb-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                      </div>
                      <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <UserIcon className="w-4 h-4" /> Profile
                      </Link>
                      <Link to="/notifications" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Bell className="w-4 h-4" /> Notifications
                      </Link>
                      <Link to="/community" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Users className="w-4 h-4" /> Community
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-ghost">Login</Link>
                <Link to="/register" className="btn-primary">Get Started</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden glass-card !rounded-t-none !border-x-0 !border-b-0"
            >
              <div className="section-padding py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <a key={link.label} href={link.path} className="nav-link">{link.label}</a>
                ))}
                {!isAuthenticated && (
                  <div className="flex gap-2 mt-2">
                    <Link to="/login" className="btn-ghost flex-1">Login</Link>
                    <Link to="/register" className="btn-primary flex-1">Get Started</Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
