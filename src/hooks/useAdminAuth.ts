import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Centralized admin authorization hook.
 *
 * Every admin page uses this single method to validate the admin role.
 * It waits for the AuthContext to finish loading both the session and
 * the profile, then checks:
 *   1. Is the user authenticated?
 *   2. Is their role 'admin' in the profile?
 *   3. Super-admin override: admin@civiceye.gov is always granted access.
 *
 * Returns a discriminated state so callers can render loading, denied,
 * or content without duplicating logic.
 */
export function useAdminAuth() {
  const { isAuthenticated, user, loading, profileLoading } = useAuth();

  const [state, setState] = useState<{
    status: 'checking' | 'authorized' | 'denied';
    user: typeof user;
  }>({ status: 'checking', user: null });

  useEffect(() => {
    if (loading || profileLoading) {
      setState({ status: 'checking', user: null });
      return;
    }

    if (!isAuthenticated) {
      console.log('[useAdminAuth] Denied — not authenticated');
      setState({ status: 'denied', user: null });
      return;
    }

    const isAdminEmail = user?.email?.toLowerCase() === 'admin@civiceye.gov';
    const isAdminRole = user?.role === 'admin';

    if (isAdminRole || isAdminEmail) {
      console.log('[useAdminAuth] Authorized — role:', user?.role, '| emailOverride:', isAdminEmail && !isAdminRole);
      setState({ status: 'authorized', user });
    } else {
      console.log('[useAdminAuth] Denied — role is', user?.role, '(not admin)');
      setState({ status: 'denied', user });
    }
  }, [isAuthenticated, user, loading, profileLoading]);

  return state;
}
