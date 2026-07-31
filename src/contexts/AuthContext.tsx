import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';
import { authService, type AuthUser, type RegistrationInput, type LoginInput } from '@/services/authService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  /** True while a session exists but the profile (and thus role) hasn't loaded yet. */
  profileLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegistrationInput) => Promise<{ username: string; userId: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (userId: string): Promise<AuthUser | null> => {
      setProfileLoading(true);
      try {
        const currentUser = await authService.getCurrentUser();
        return currentUser;
      } catch (err: any) {
        console.error('[AuthContext] Failed to fetch profile:', err?.message);
        // Surface the error to the user via the toast system if available,
        // but we can't access useToast here (it's outside the provider tree).
        // The error is logged and the user is returned as null so route guards
        // redirect to /login with a clear console trace.
        return null;
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };

    // Restore session on mount
    (async () => {
      try {
        const { data: { session } }: { data: { session: Session | null } } =
          await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          console.log('[AuthContext] Session found on mount for user:', session.user.id);
          const currentUser = await fetchProfile(session.user.id);
          if (mounted) {
            setUser(currentUser);
            console.log('[AuthContext] Profile loaded:', currentUser?.role, currentUser?.username);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Session restore failed:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] onAuthStateChange:', event, 'session:', !!session);

      (async () => {
        if (!mounted) return;

        if (session?.user) {
          // During registration, signUp fires SIGNED_IN immediately.
          // We must wait for the profile to be created by the trigger before
          // allowing route guards to redirect based on role.
          const currentUser = await fetchProfile(session.user.id);
          if (mounted) {
            setUser(currentUser);
            console.log('[AuthContext] Profile loaded after auth event:', currentUser?.role);
          }
        } else {
          if (mounted) setUser(null);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (input: LoginInput): Promise<AuthUser> => {
    console.log('[AuthContext] login() called for email:', input.email);
    const authUser = await authService.login(input);
    console.log('[AuthContext] login() success, role:', authUser.role, '| redirect target:', authUser.role === 'admin' ? '/admin' : '/dashboard');
    setUser(authUser);
    return authUser;
  };

  const register = async (input: RegistrationInput) => {
    console.log('[AuthContext] register() called for:', input.email);
    const result = await authService.register(input);
    console.log('[AuthContext] register() success, username:', result.username);
    return result;
  };

  const logout = async () => {
    console.log('[AuthContext] logout() called');
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, profileLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
