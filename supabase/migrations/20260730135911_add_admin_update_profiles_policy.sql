/*
# Add admin UPDATE policy on profiles for user management

1. Security Changes
- Added an UPDATE policy on `profiles` allowing admin users (role = 'admin') to
  update ANY profile row. This is required for admin user-management operations
  (flag/unflag/ban/unban) which currently fail RLS because only owner-scoped
  updates were permitted.
- The existing owner-scoped update policy remains in place; this is additive.
2. Important Notes
- Admins are identified by a subquery: EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin').
- Citizens can still only update their own profile. Admins can update all profiles.
*/

DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
