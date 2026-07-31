import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Users, Mic } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatCard';
import { adminReportService } from '@/services/adminReportService';
import { AdminReportsPanel } from '@/components/admin/AdminReportsPanel';
import { AdminUsersPanel } from '@/components/admin/AdminUsersPanel';
import { AdminVoiceComplaintsPanel } from '@/components/admin/AdminVoiceComplaintsPanel';

type Tab = 'reports' | 'voice' | 'users';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'reports', label: 'Reports Management', icon: FileText },
  { id: 'voice', label: 'Voice Complaints', icon: Mic },
  { id: 'users', label: 'User Management', icon: Users },
];

export function AdminPortalPage() {
  const [adminChecking, setAdminChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('reports');

  useEffect(() => {
    (async () => {
      try {
        const admin = await adminReportService.isAdmin();
        setIsAdmin(admin);
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminChecking(false);
      }
    })();
  }, []);

  if (adminChecking) return <PageLoader />;

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <ErrorState
          title="Access Denied"
          message="You need admin privileges to view this page. Sign in with an admin account to access the admin portal."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 mb-6 flex items-center gap-3"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admin Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Receive reports, update statuses, and manage users</p>
        </div>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 p-1.5 glass-card rounded-2xl w-fit">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'reports' && <AdminReportsPanel />}
        {activeTab === 'voice' && <AdminVoiceComplaintsPanel />}
        {activeTab === 'users' && <AdminUsersPanel />}
      </motion.div>
    </DashboardLayout>
  );
}
