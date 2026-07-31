import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Lock, Moon, Sun, Globe, Mail, Phone, Shield, User as UserIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState({
    reportSubmitted: true,
    aiCompleted: true,
    departmentAssigned: true,
    repairStarted: false,
    issueResolved: true,
    rewardCredited: true,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
    showToast('Notification preference updated', 'success');
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {theme === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
            Appearance
          </h3>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Switch between light and dark themes</p>
            </div>
            <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" /> Notification Preferences
          </h3>
          <div className="space-y-2">
            {[
              { key: 'reportSubmitted', label: 'Report Submitted', desc: 'When you submit a new report' },
              { key: 'aiCompleted', label: 'AI Processing Completed', desc: 'When AI finishes analysing your report' },
              { key: 'departmentAssigned', label: 'Department Assigned', desc: 'When a department is assigned to your report' },
              { key: 'repairStarted', label: 'Repair Started', desc: 'When work begins on your report' },
              { key: 'issueResolved', label: 'Issue Resolved', desc: 'When your reported issue is resolved' },
              { key: 'rewardCredited', label: 'Reward Credited', desc: 'When you earn points for a verified report' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
                <button onClick={() => handleToggle(item.key as keyof typeof notifications)} className={`relative w-12 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Account Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-emerald-500" /> Account
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Full Name</label>
              <input defaultValue={user?.name} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Email</label>
              <input defaultValue={user?.email} disabled className="input-field opacity-60" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Phone</label>
              <input defaultValue={user?.phone ?? ''} placeholder="Enter your phone number" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">City</label>
              <input defaultValue={user?.city ?? ''} placeholder="Enter your city" className="input-field" />
            </div>
            <button onClick={() => showToast('Profile updated successfully', 'success')} className="btn-primary">
              Save Changes
            </button>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-500" /> Security
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Current Password</label>
              <input type="password" placeholder="••••••••" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">New Password</label>
              <input type="password" placeholder="••••••••" className="input-field" />
            </div>
            <button onClick={() => showToast('Password updated (mock)', 'success')} className="btn-secondary">
              Update Password
            </button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
