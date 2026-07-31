import { supabase } from '@/services/supabaseClient';
import { generateUniqueUsername } from '@/services/usernameService';

export interface RegistrationInput {
  fullName: string;
  email: string;
  password: string;
}

export interface RegistrationResult {
  username: string;
  userId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  fullName: string;
  role: 'citizen' | 'admin';
  avatar: string | null;
  avatarUrl: string | null;
  phone: string;
  city: string;
  points: number;
  trustScore: number;
  level: string;
  rank: number;
  reportsSubmitted: number;
  reportsVerified: number;
  reportsRejected: number;
  accountStatus: string;
  lastLoginAt: string | null;
  joinedAt: string;
  createdAt: string;
}

export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
};

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_RULES.minLength)
    return `Password must be at least ${PASSWORD_RULES.minLength} characters long`;
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password))
    return 'Password must contain at least one uppercase letter';
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password))
    return 'Password must contain at least one lowercase letter';
  if (PASSWORD_RULES.requireDigit && !/\d/.test(password))
    return 'Password must contain at least one digit';
  if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password))
    return 'Password must contain at least one special character';
  return null;
}

export function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

export const authService = {
  async register(input: RegistrationInput): Promise<RegistrationResult> {
    const { fullName, email, password } = input;

    if (!fullName.trim() || fullName.trim().length < 2)
      throw new Error('Please enter your full name (minimum 2 characters)');
    if (!validateEmail(email))
      throw new Error('Please enter a valid email address');
    const pwError = validatePassword(password);
    if (pwError) throw new Error(pwError);

    // Citizens always register as 'citizen'. Admin accounts are pre-created
    // in Supabase Auth — there is no public admin registration path.
    const role = 'citizen';

    // Create the auth user. The database trigger `handle_new_user` will
    // automatically insert a profiles row — no manual insert needed.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim(), role } },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('already registered'))
        throw new Error('An account with this email already exists. Please sign in instead.');
      if (msg.includes('password'))
        throw new Error('Password does not meet security requirements.');
      if (msg.includes('email'))
        throw new Error('Invalid email address. Please check and try again.');
      throw new Error(authError.message);
    }

    if (!authData.user) throw new Error('Registration failed — no user returned');

    const userId = authData.user.id;

    // Wait briefly for the trigger to create the profile, then generate + save username
    let username = '';
    try {
      // The trigger creates the profile row; give it a moment to commit
      await new Promise((r) => setTimeout(r, 300));
      username = await generateUniqueUsername(role);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username, full_name: fullName.trim() })
        .eq('id', userId);

      if (profileError) {
        // Profile exists (trigger created it) but update failed — retry once
        await new Promise((r) => setTimeout(r, 300));
        await supabase.from('profiles').update({ username }).eq('id', userId);
      }
    } catch {
      // Username generation failed, but the account is created.
      // The user can set their username later — don't fail registration.
    }

    return { username, userId };
  },

  async login(input: LoginInput): Promise<AuthUser> {
    const { email, password } = input;

    if (!email.trim()) throw new Error('Please enter your email address');
    if (!password) throw new Error('Please enter your password');

    console.log('[authService] Login attempt for email:', email);

    // Step 1: Authenticate with Supabase Auth using the exact email the user typed.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('[authService] Auth failure:', authError.message);
      if (authError.message.includes('Invalid login credentials'))
        throw new Error('Invalid email or password');
      throw new Error(authError.message);
    }
    if (!authData.user) throw new Error('Login failed — no session created');

    // Step 2: Print the authenticated user object and user.id
    console.log('[authService] Auth success. Full user object:', authData.user);
    console.log('[authService] user.id:', authData.user.id);
    console.log('[authService] user.email:', authData.user.email);

    // Step 3: Fetch from public.profiles using .select("*").eq("id", user.id).single()
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Step 4: Print profile data, error code, and error message
    console.log('[authService] Profile fetch result — data:', profileData);
    console.log('[authService] Profile fetch result — error code:', profileError?.code ?? 'none');
    console.log('[authService] Profile fetch result — error message:', profileError?.message ?? 'none');
    console.log('[authService] Profile fetch result — error details:', profileError);

    if (profileError) {
      // Do NOT hide the Supabase error behind a generic message.
      await supabase.auth.signOut();
      throw new Error(
        `Profile lookup failed [${profileError.code}]: ${profileError.message}`
      );
    }

    if (!profileData) {
      console.error('[authService] No profile row found for user.id:', authData.user.id);
      await supabase.auth.signOut();
      throw new Error(
        `No profile row found in public.profiles for user id: ${authData.user.id}`
      );
    }

    if (profileData.banned) {
      await supabase.auth.signOut();
      throw new Error('Your account has been banned. Please contact support.');
    }
    if (profileData.account_status === 'suspended') {
      await supabase.auth.signOut();
      throw new Error('Your account has been suspended. Please contact support.');
    }

    console.log('[authService] Profile loaded successfully. Role:', profileData.role);
    return mapProfileToAuthUser(profileData);
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('[authService] getCurrentUser: no session');
      return null;
    }

    console.log('[authService] getCurrentUser: session.user.id:', session.user.id);
    console.log('[authService] getCurrentUser: session.user.email:', session.user.email);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    console.log('[authService] getCurrentUser: profile data:', profileData);
    console.log('[authService] getCurrentUser: error code:', profileError?.code ?? 'none');
    console.log('[authService] getCurrentUser: error message:', profileError?.message ?? 'none');
    console.log('[authService] getCurrentUser: error details:', profileError);

    if (profileError) {
      console.error('[authService] getCurrentUser: profile fetch failed:', profileError.code, profileError.message);
      await supabase.auth.signOut();
      throw new Error(`Profile lookup failed [${profileError.code}]: ${profileError.message}`);
    }

    if (!profileData) {
      console.error('[authService] getCurrentUser: no profile row for user', session.user.id);
      await supabase.auth.signOut();
      throw new Error(`No profile row found in public.profiles for user id: ${session.user.id}`);
    }

    console.log('[authService] getCurrentUser: profile loaded, role:', profileData.role);
    return mapProfileToAuthUser(profileData);
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  // ============ Password Recovery ============

  async sendResetCode(email: string): Promise<string> {
    if (!validateEmail(email)) throw new Error('Please enter a valid email address');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!profile) throw new Error('No account found with this email address');

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('email', email.toLowerCase())
      .eq('used', false);

    const { error } = await supabase.from('password_reset_codes').insert({
      user_id: profile.id,
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw new Error('Failed to generate reset code');

    // Return the code so callers can display it in dev mode.
    // NEVER expose to window — that leaks the secret to extensions / injected scripts.
    return code;
  },

  async verifyResetCode(email: string, code: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('password_reset_codes')
      .select('id, expires_at, used')
      .eq('email', email.toLowerCase())
      .eq('code', code.trim())
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return false;
    if (new Date(data.expires_at) < new Date()) return false;

    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('id', data.id);

    return true;
  },

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const pwError = validatePassword(newPassword);
    if (pwError) throw new Error(pwError);

    // Use updateUser to actually change the password.
    // The caller must ensure the reset code was verified first.
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      // If no active session, fall back to sending a reset email link.
      if (error.message.includes('Auth session missing') || error.status === 401) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/login',
        });
        if (resetError) throw new Error(resetError.message);
        throw new Error('No active session. A password reset link has been sent to your email.');
      }
      throw new Error(error.message);
    }
  },
};

function mapProfileToAuthUser(p: any): AuthUser {
  return {
    id: p.id,
    username: p.username ?? '',
    email: p.email ?? '',
    name: p.full_name ?? '',
    fullName: p.full_name ?? '',
    role: (p.role as 'citizen' | 'admin') ?? 'citizen',
    avatar: p.avatar_url ?? null,
    avatarUrl: p.avatar_url ?? null,
    phone: p.phone ?? '',
    city: p.city ?? '',
    points: p.points ?? 0,
    trustScore: p.trust_score ?? 50,
    level: p.level ?? 'Bronze',
    rank: p.rank ?? 0,
    reportsSubmitted: p.reports_submitted ?? 0,
    reportsVerified: p.reports_verified ?? 0,
    reportsRejected: p.reports_rejected ?? 0,
    accountStatus: p.account_status ?? 'active',
    lastLoginAt: p.last_login_at ?? null,
    joinedAt: p.created_at ?? new Date().toISOString(),
    createdAt: p.created_at ?? new Date().toISOString(),
  };
}
