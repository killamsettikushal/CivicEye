import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bug, Database, User, Route, Wifi, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';

interface DebugInfo {
  user: any;
  session: any;
  profile: any;
  role: string | null;
  route: string;
  dbConnection: 'ok' | 'failed' | 'checking';
  lastError: string | null;
}

export function AdminDebugPage() {
  const { user, isAuthenticated, loading, profileLoading } = useAuth();
  const [info, setInfo] = useState<DebugInfo>({
    user: null,
    session: null,
    profile: null,
    role: null,
    route: window.location.pathname,
    dbConnection: 'checking',
    lastError: null,
  });

  useEffect(() => {
    (async () => {
      try {
        // Get session
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        // Get user from auth
        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData.user;

        // Get profile from profiles table
        let profile = null;
        let profileError = null;
        if (authUser) {
          const { data: p, error: e } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
          profile = p;
          profileError = e;
        }

        // Test DB connection
        const { error: dbError } = await supabase.from('profiles').select('id').limit(1);

        setInfo({
          user: authUser,
          session: session ? { access_token: '***', expires_at: session.expires_at, user_id: session.user?.id } : null,
          profile,
          role: profile?.role ?? user?.role ?? null,
          route: window.location.pathname,
          dbConnection: dbError ? 'failed' : 'ok',
          lastError: profileError?.message ?? dbError?.message ?? null,
        });
      } catch (err: any) {
        setInfo((prev) => ({
          ...prev,
          dbConnection: 'failed',
          lastError: err?.message ?? 'Unknown error',
        }));
      }
    })();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <Bug className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admin Debug Page</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Diagnose authentication and routing issues</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Auth State */}
          <DebugCard title="Auth Context" icon={User}>
            <Row label="isAuthenticated" value={String(isAuthenticated)} />
            <Row label="loading" value={String(loading)} />
            <Row label="profileLoading" value={String(profileLoading)} />
            <Row label="user.id" value={user?.id ?? 'null'} />
            <Row label="user.username" value={user?.username ?? 'null'} />
            <Row label="user.role" value={user?.role ?? 'null'} />
            <Row label="user.name" value={user?.name ?? 'null'} />
            <Row label="user.email" value={user?.email ?? 'null'} />
          </DebugCard>

          {/* Session */}
          <DebugCard title="Supabase Session" icon={Database}>
            {info.session ? (
              <>
                <Row label="session exists" value="true" ok />
                <Row label="session.user_id" value={info.session.user_id ?? 'null'} />
                <Row label="session.expires_at" value={info.session.expires_at ? new Date(info.session.expires_at * 1000).toLocaleString() : 'null'} />
              </>
            ) : (
              <Row label="session" value="null" warn />
            )}
          </DebugCard>

          {/* Profile */}
          <DebugCard title="Database Profile" icon={Database}>
            {info.profile ? (
              <>
                <Row label="profile exists" value="true" ok />
                <Row label="profile.id" value={info.profile.id ?? 'null'} />
                <Row label="profile.role" value={info.profile.role ?? 'null'} />
                <Row label="profile.username" value={info.profile.username ?? 'null'} />
                <Row label="profile.email" value={info.profile.email ?? 'null'} />
                <Row label="profile.banned" value={String(info.profile.banned ?? false)} />
                <Row label="profile.account_status" value={info.profile.account_status ?? 'null'} />
              </>
            ) : (
              <Row label="profile" value="null — trigger may not have fired" warn />
            )}
          </DebugCard>

          {/* Route & DB */}
          <DebugCard title="Route & Connection" icon={Route}>
            <Row label="current route" value={info.route} />
            <Row label="db connection" value={info.dbConnection} ok={info.dbConnection === 'ok'} warn={info.dbConnection === 'failed'} />
            {info.lastError && <Row label="last error" value={info.lastError} warn />}
          </DebugCard>
        </div>

        {/* Raw profile JSON */}
        {info.profile && (
          <details className="mt-4">
            <summary className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer">Raw Profile JSON</summary>
            <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl overflow-x-auto mt-2">
              {JSON.stringify(info.profile, null, 2)}
            </pre>
          </details>
        )}

        <div className="flex gap-3 mt-6">
          <Link to="/admin" className="btn-primary flex items-center gap-2">
            <Route className="w-4 h-4" /> Go to Admin Dashboard
          </Link>
          <Link to="/login" className="btn-ghost flex items-center gap-2">
            <User className="w-4 h-4" /> Go to Login
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

function DebugCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}:</span>
      <span className={`font-mono font-medium flex items-center gap-1 ${
        ok ? 'text-emerald-600 dark:text-emerald-400' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'
      }`}>
        {ok && <CheckCircle2 className="w-3 h-3" />}
        {warn && <AlertCircle className="w-3 h-3" />}
        {value}
      </span>
    </div>
  );
}
