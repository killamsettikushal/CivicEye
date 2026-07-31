/*
# Fix infinite recursion in profiles RLS policies

## Problem
The `admin_read_all_profiles` and `admin_update_all_profiles` policies queried
the `profiles` table from INSIDE a profiles policy:

    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')

This causes PostgreSQL to evaluate the profiles RLS policies recursively while
evaluating the policy itself → error 42P17 "infinite recursion detected in
policy for relation".

## Fix
1. Drop ALL existing policies on `profiles` (including the recursive ones and
   the now-obsolete `select_by_username` policy that allowed public access).
2. Replace with simple, non-recursive policies:
   - SELECT: authenticated users can read their own row (auth.uid() = id).
   - INSERT: authenticated users can insert their own row.
   - UPDATE: authenticated users can update their own row.
3. Admin role checks are handled in application code (AuthContext / route guards),
   NOT via recursive RLS policies that query the profiles table.

## Security
- RLS remains enabled on `profiles`.
- No policy queries the `profiles` table from within a profiles policy.
- `select_by_username` (public/anon, USING true) is removed — it was a leftover
  from the old username-based login flow and allowed anyone to read all profiles.
*/

-- Drop every existing policy on profiles to guarantee no recursive policy survives
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "select_by_username" ON profiles;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_last_login" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can read their own profile only
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- INSERT: authenticated users can insert their own profile only
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- UPDATE: authenticated users can update their own profile only
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
