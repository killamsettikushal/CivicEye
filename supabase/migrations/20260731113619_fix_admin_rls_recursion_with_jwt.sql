/*
# Fix admin authentication: eliminate RLS recursion + use JWT role claim

## Problem
Admin RLS policies on `profiles`, `reports`, `notifications`, `redemptions`,
`reward_history`, `admin_logs`, `departments`, `incident_clusters`, and
`report_assignments` detect admins via:

    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')

This queries `profiles` from INSIDE an RLS policy. When PostgreSQL evaluates that
subquery it applies the profiles SELECT policy (`auth.uid() = id`), which is fine
for the admin's own row — BUT the `admin_update_all_profiles` policy on `profiles`
itself queries `profiles`, creating infinite recursion (error 42P17). Even where
it doesn't recurse, the subquery adds overhead and couples every admin policy to
the profiles table's policy state.

## Fix
The admin role is stored in `raw_app_meta_data` (the JWT's `app_metadata`), which
Supabase exposes via `auth.jwt() ->> 'role'`. This is the user-immutable claim
set at signup and never editable from the client. All admin policies are rewritten
to use:

    (auth.jwt() ->> 'role') = 'admin'

This:
  1. Eliminates all recursion (no profiles subquery inside any policy).
  2. Is faster (JWT claim lookup vs table scan).
  3. Is more secure (role comes from the signed JWT, not a user-mutable table row).

## Changes per table
- profiles: admin SELECT + UPDATE policies use JWT claim.
- reports: admin SELECT, UPDATE, DELETE policies use JWT claim.
- notifications: admin SELECT + INSERT policies use JWT claim.
- redemptions: admin SELECT policy uses JWT claim.
- reward_history: admin SELECT policy uses JWT claim.
- admin_logs: admin SELECT + INSERT policies use JWT claim.
- departments: admin INSERT policy uses JWT claim.
- incident_clusters: admin policies use JWT claim.
- report_assignments: admin SELECT + INSERT policies use JWT claim.

## Security
- RLS remains enabled on every table.
- Owner-scoped policies (auth.uid() = ...) are untouched.
- The JWT `role` claim is set at signup via raw_app_meta_data and is not client-mutable.
- No policy queries the profiles table from within any policy.
*/

-- ============ profiles ============
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- ============ reports ============
DROP POLICY IF EXISTS "admin_read_all_reports" ON reports;
CREATE POLICY "admin_read_all_reports" ON reports FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_update_all_reports" ON reports;
CREATE POLICY "admin_update_all_reports" ON reports FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_update_reports" ON reports;
CREATE POLICY "admin_update_reports" ON reports FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_delete_reports" ON reports;
CREATE POLICY "admin_delete_reports" ON reports FOR DELETE
  TO authenticated USING ((auth.jwt() ->> 'role') = 'admin');

-- ============ notifications ============
DROP POLICY IF EXISTS "admin_read_notifications" ON notifications;
CREATE POLICY "admin_read_notifications" ON notifications FOR SELECT
  TO authenticated USING (
    recipient_type = 'admin' AND (auth.jwt() ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "admin_insert_notifications" ON notifications;
CREATE POLICY "admin_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    recipient_type = 'admin' AND (auth.jwt() ->> 'role') = 'admin'
  );

-- ============ redemptions ============
DROP POLICY IF EXISTS "admin_read_all_redemptions" ON redemptions;
CREATE POLICY "admin_read_all_redemptions" ON redemptions FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'role') = 'admin');

-- ============ reward_history ============
DROP POLICY IF EXISTS "admin_read_all_reward_history" ON reward_history;
CREATE POLICY "admin_read_all_reward_history" ON reward_history FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'role') = 'admin');

-- ============ admin_logs ============
DROP POLICY IF EXISTS "admin_read_logs" ON admin_logs;
CREATE POLICY "admin_read_logs" ON admin_logs FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_insert_logs" ON admin_logs;
CREATE POLICY "admin_insert_logs" ON admin_logs FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- ============ departments ============
DROP POLICY IF EXISTS "admin_manage_departments" ON departments;
CREATE POLICY "admin_manage_departments" ON departments FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- ============ incident_clusters ============
DROP POLICY IF EXISTS "admin_read_clusters" ON incident_clusters;
CREATE POLICY "admin_read_clusters" ON incident_clusters FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_manage_clusters" ON incident_clusters;
CREATE POLICY "admin_manage_clusters" ON incident_clusters FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- ============ report_assignments ============
DROP POLICY IF EXISTS "admin_read_assignments" ON report_assignments;
CREATE POLICY "admin_read_assignments" ON report_assignments FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_insert_assignments" ON report_assignments;
CREATE POLICY "admin_insert_assignments" ON report_assignments FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
