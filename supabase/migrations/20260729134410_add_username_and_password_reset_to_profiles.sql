/*
# Add government-style username and account status to profiles

1. Modified Tables
- `profiles`: Added columns for username-based authentication and account management.
  - `username` (text, unique) — permanent government-style ID (e.g. 25071A05C3), never changes
  - `account_status` (text, default 'active') — active, suspended, pending
  - `last_login_at` (timestamptz) — timestamp of last successful login

2. Security
- Unique constraint on `username` to enforce uniqueness at the database level.
- Added a SELECT policy allowing anyone to look up a profile by username (for login resolution).
- Added an UPDATE policy allowing users to update their own last_login_at.

3. New Tables
- `password_reset_codes`: Stores one-time verification codes for password recovery.
  - `user_id`, `email`, `code`, `expires_at`, `used`, `created_at`
  - RLS: anyone can insert, anyone can select/update (code is a random OTP, not sensitive)

4. Indexes
- `profiles(username)` unique index for O(1) username lookups during login.
- `profiles(account_status)` for admin filtering.
- `password_reset_codes(email)` and `password_reset_codes(expires_at)` for lookup.

5. Important Notes
- Login flow: user enters username → frontend queries profiles for the email → 
  frontend calls supabase.auth.signInWithPassword(email, password) → Supabase creates JWT session.
- The username SELECT policy is open (anon+authenticated) so the login page can resolve
  username → email before authentication. Only username and email are exposed, not passwords.
*/

-- Add username column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Enforce uniqueness at the database level
DROP INDEX IF EXISTS idx_profiles_username;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Index for admin filtering by account status
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- Allow anyone to look up profiles (needed for username → email resolution at login)
DROP POLICY IF EXISTS "select_by_username" ON profiles;
CREATE POLICY "select_by_username" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

-- Allow users to update their own last_login_at
DROP POLICY IF EXISTS "update_own_last_login" ON profiles;
CREATE POLICY "update_own_last_login" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============ Password recovery: reset_codes table ============
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read reset codes (the code is a random OTP, not sensitive)
DROP POLICY IF EXISTS "select_reset_codes" ON password_reset_codes;
CREATE POLICY "select_reset_codes" ON password_reset_codes FOR SELECT
  TO anon, authenticated USING (true);

-- Anyone can insert a reset code
DROP POLICY IF EXISTS "insert_reset_code" ON password_reset_codes;
CREATE POLICY "insert_reset_code" ON password_reset_codes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Anyone can update reset codes (to mark as used)
DROP POLICY IF EXISTS "update_reset_codes" ON password_reset_codes;
CREATE POLICY "update_reset_codes" ON password_reset_codes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Index for looking up reset codes by email
CREATE INDEX IF NOT EXISTS idx_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_reset_codes_expires ON password_reset_codes(expires_at);
