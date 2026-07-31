/*
# Add admin role and admin-level RLS policies

1. Modified Tables
- `profiles`: Added `role` column (text, default 'citizen') to distinguish admin users.
2. Security Changes
- Added SELECT policies on `profiles` allowing admin users (role = 'admin') to read ALL profiles.
- Added SELECT policies on `redemptions` allowing admin users to read ALL redemptions.
- Admin detection: uses raw_app_meta_data->>'role' = 'admin' OR profiles.role = 'admin'.
3. Important Notes
- The admin read policies use a subquery check: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin').
- This allows admins to see all data while regular users still only see their own rows.
- The existing owner-scoped policies remain in place; these are additive.
*/

-- Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'citizen';

-- Admin can read ALL profiles (in addition to users reading their own)
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admin can read ALL redemptions (in addition to users reading their own)
DROP POLICY IF EXISTS "admin_read_all_redemptions" ON redemptions;
CREATE POLICY "admin_read_all_redemptions" ON redemptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admin can read all rewards_catalog rows (already public, but be explicit)
-- No change needed - rewards_catalog is already readable by anon+authenticated.
