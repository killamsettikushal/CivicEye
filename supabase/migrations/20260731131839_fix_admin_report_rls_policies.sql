-- Fix: admin RLS policies on reports table used auth.jwt() ->> 'role' = 'admin'
-- which never matches because Supabase JWTs always have role = 'authenticated'.
-- The admin role is stored in profiles.role, not in the JWT. Replace all
-- admin policies to check profiles.role = 'admin' via a subquery.

-- Drop the broken policies
DROP POLICY IF EXISTS admin_read_all_reports ON reports;
DROP POLICY IF EXISTS admin_update_all_reports ON reports;
DROP POLICY IF EXISTS admin_update_reports ON reports;
DROP POLICY IF EXISTS admin_delete_reports ON reports;

-- Recreate with correct admin check (profiles.role = 'admin')
CREATE POLICY admin_read_all_reports ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR auth.uid() = reporter_id
  );

CREATE POLICY admin_update_all_reports ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR auth.uid() = reporter_id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR auth.uid() = reporter_id
  );

CREATE POLICY admin_delete_reports ON reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
