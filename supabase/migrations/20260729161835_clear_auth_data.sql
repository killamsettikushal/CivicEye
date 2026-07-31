-- Clear all Supabase auth data (users, sessions, refresh tokens, MFA, flow state)
-- Using a DO block to handle permission checks gracefully
DO $$
BEGIN
  DELETE FROM auth.mfa_factors;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DELETE FROM auth.flow_state;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DELETE FROM auth.sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DELETE FROM auth.refresh_tokens;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DELETE FROM auth.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT 'Auth cleanup attempted' as status;
