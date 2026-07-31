import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, Component, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { RegistrationSuccessPage } from '@/pages/auth/RegistrationSuccessPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { CitizenDashboard } from '@/pages/CitizenDashboard';
import { ReportSubmissionPage } from '@/pages/ReportSubmissionPage';
import { AIProcessingPage } from '@/pages/AIProcessingPage';
import { AIResultPage } from '@/pages/AIResultPage';
import { ReportsListPage } from '@/pages/ReportsListPage';
import { RewardsPage } from '@/pages/RewardsPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SearchPage } from '@/pages/SearchPage';
import { LiveMapPage } from '@/pages/LiveMapPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminPortalPage } from '@/pages/AdminPortalPage';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CommunityPage } from '@/pages/CommunityPage';
import { AdminDebugPage } from '@/pages/AdminDebugPage';
import { AIAnalyzerPage } from '@/pages/AIAnalyzerPage';
import { ErrorBoundary, ErrorFallback } from '@/components/ui/ErrorBoundary';

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Protects a route so only authenticated users can access it.
 * Waits for both the session AND the profile to load before deciding.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) return <FullPageLoader />;
  if (!isAuthenticated) {
    console.log('[Router] ProtectedRoute → redirect to /login (not authenticated)');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/**
 * Protects a route so only ADMIN users can access it.
 * Does NOT redirect until the profile (and thus role) is fully loaded.
 */
function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading, profileLoading } = useAuth();

  if (loading || profileLoading) return <FullPageLoader />;
  if (!isAuthenticated) {
    console.log('[Router] AdminRoute → redirect to /login (not authenticated)');
    return <Navigate to="/login" replace />;
  }

  // Super-admin override: admin@civiceye.gov is always granted access,
  // even if the profile row hasn't loaded correctly or role is mismatched.
  const isAdminEmail = user?.email?.toLowerCase() === 'admin@civiceye.gov';
  if (user?.role !== 'admin' && !isAdminEmail) {
    console.log('[Router] AdminRoute → redirect to /admin/access-denied (role is not admin, got:', user?.role, ')');
    return <Navigate to="/admin/access-denied" replace />;
  }
  console.log('[Router] AdminRoute → rendering admin page for user:', user?.username, '| role:', user?.role, '| adminOverride:', isAdminEmail && user?.role !== 'admin');
  return <>{children}</>;
}

/**
 * Protects a route so only CITIZEN users can access it.
 * Admins are redirected to their admin dashboard.
 */
function CitizenRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading, profileLoading } = useAuth();

  if (loading || profileLoading) return <FullPageLoader />;
  if (!isAuthenticated) {
    console.log('[Router] CitizenRoute → redirect to /login (not authenticated)');
    return <Navigate to="/login" replace />;
  }
  if (user?.role === 'admin') {
    console.log('[Router] CitizenRoute → redirect to /admin (user is admin)');
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

/**
 * Redirects authenticated users away from auth pages (login, register).
 * Waits for profile to load so role-based redirect is correct.
 */
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading, profileLoading } = useAuth();

  if (loading || profileLoading) return <FullPageLoader />;
  if (isAuthenticated) {
    const target = user?.role === 'admin' ? '/admin' : '/dashboard';
    console.log('[Router] PublicOnlyRoute → redirect to', target, '(already authenticated, role:', user?.role, ')');
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  // Debug: log every route change
  useEffect(() => {
    console.log('[Router] Route changed:', location.pathname, '| auth:', isAuthenticated, '| role:', user?.role, '| loading:', loading);
  }, [location.pathname, isAuthenticated, user?.role, loading]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/registration-success" element={<RegistrationSuccessPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/map" element={<LiveMapPage />} />

      {/* Citizen-only routes */}
      <Route path="/dashboard" element={<CitizenRoute><CitizenDashboard /></CitizenRoute>} />
      <Route path="/report" element={<CitizenRoute><ReportSubmissionPage /></CitizenRoute>} />
      <Route path="/processing/:reportId" element={<CitizenRoute><AIProcessingPage /></CitizenRoute>} />
      <Route path="/result/:reportId" element={<ProtectedRoute><AIResultPage /></ProtectedRoute>} />
      <Route path="/reports" element={<CitizenRoute><ReportsListPage /></CitizenRoute>} />
      <Route path="/rewards" element={<CitizenRoute><RewardsPage /></CitizenRoute>} />
      <Route path="/leaderboard" element={<CitizenRoute><LeaderboardPage /></CitizenRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/ai-analyzer" element={<ProtectedRoute><AIAnalyzerPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Admin-only routes */}
      <Route path="/admin/login" element={<PublicOnlyRoute><AdminLoginPage /></PublicOnlyRoute>} />
      <Route path="/admin/access-denied" element={<AccessDeniedPage />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/portal" element={<AdminRoute><AdminPortalPage /></AdminRoute>} />
      <Route path="/admin/debug" element={<AdminRoute><AdminDebugPage /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary fallback={ErrorFallback}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
