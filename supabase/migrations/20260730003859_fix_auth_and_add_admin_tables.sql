/*
# Fix authentication: auto-create profile trigger + schema improvements

## 1. Auto-profile creation trigger
The #1 auth bug: no trigger existed to create a `profiles` row when a user signs up.
The frontend tried to manually insert/update, which is fragile — if it fails, the user
exists in auth.users but not in profiles, causing "User already exists" on retry and
"Unable to verify credentials" on login.

This migration creates a `handle_new_user` trigger that automatically inserts a
profiles row with the email, full_name, and role from auth.users metadata.

## 2. New Tables
- `notifications`: Stores both citizen and admin notifications.
  - id, user_id (nullable for broadcast/admin notifications), recipient_type ('citizen'|'admin'),
  - type, title, message, report_id, read, created_at
- `departments`: Government departments for assignment.
  - id, name, categories (text[]), icon, active, created_at
- `admin_logs`: Audit trail of admin actions.
  - id, admin_id, action, report_id, details, created_at
- `incident_clusters`: Groups of nearby/duplicate reports.
  - id, center_lat, center_lng, radius_meters, report_ids (text[]), status, created_at
- `report_assignments`: Department assignment history per report.
  - id, report_id, department, assigned_by, assigned_at, notes

## 3. Modified Tables
- `profiles`: Added `banned` boolean (default false) for ban checks.
- `reports`: Added columns needed by admin dashboard:
  - `resolved_at` (timestamptz), `priority_score` (integer), `assigned_at` (timestamptz),
  - `assigned_by` (uuid), `admin_notes` (text)

## 4. Security
- RLS on all new tables.
- notifications: owner-scoped for citizen, admin-scoped for admin notifications.
- departments: public read (anon+authenticated).
- admin_logs: admin-only.
- incident_clusters: admin-only.
- report_assignments: admin-only.
- Trigger function runs as SECURITY DEFINER to insert into profiles regardless of caller role.

## 5. Important Notes
- The trigger reads `raw_user_meta_data->>'role'` (defaulting to 'citizen') and
  `raw_user_meta_data->>'full_name'` from the signUp options.
- Username is left NULL initially — the frontend generates and updates it after signup.
- This makes registration atomic: signUp succeeds → profile exists, guaranteed.
*/

-- ============ Auto-profile creation trigger ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'citizen')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ Add banned column to profiles ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- ============ Add columns to reports ============
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 50;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_by uuid;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT '';

-- ============ Notifications table ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_type text NOT NULL DEFAULT 'citizen',
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  report_id text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Citizens can read their own notifications
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Citizens can insert their own notifications
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Citizens can update their own notifications (mark as read)
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins can read admin-targeted notifications
DROP POLICY IF EXISTS "admin_read_notifications" ON notifications;
CREATE POLICY "admin_read_notifications" ON notifications FOR SELECT
  TO authenticated USING (
    recipient_type = 'admin' AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can insert admin notifications
DROP POLICY IF EXISTS "admin_insert_notifications" ON notifications;
CREATE POLICY "admin_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    recipient_type = 'admin' AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Anyone authenticated can insert citizen notifications (for system-generated alerts)
DROP POLICY IF EXISTS "insert_citizen_notifications" ON notifications;
CREATE POLICY "insert_citizen_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (recipient_type = 'citizen');

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============ Departments table ============
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  categories text[] DEFAULT '{}',
  icon text DEFAULT 'Building2',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_departments" ON departments;
CREATE POLICY "read_departments" ON departments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manage_departments" ON departments;
CREATE POLICY "admin_manage_departments" ON departments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Seed departments
INSERT INTO departments (name, categories, icon) VALUES
  ('Engineering', ARRAY['pothole','road-crack','road-block','road-damage'], 'Wrench'),
  ('Electrical', ARRAY['broken-streetlight','traffic-signal-damage'], 'Zap'),
  ('Water Supply', ARRAY['water-leakage'], 'Droplets'),
  ('Sanitation', ARRAY['garbage','open-drain'], 'Trash2'),
  ('Traffic Police', ARRAY['helmet-missing','triple-riding','wrong-side-driving','illegal-parking','signal-jumping','mobile-phone-usage','seatbelt-missing','dangerous-driving','no-parking-violation','over-speeding'], 'Car'),
  ('Municipal Corporation', ARRAY['illegal-construction'], 'Building2'),
  ('Enforcement Cell', ARRAY['other'], 'Shield')
ON CONFLICT (name) DO NOTHING;

-- ============ Admin logs table ============
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  report_id text,
  details text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_logs" ON admin_logs;
CREATE POLICY "admin_read_logs" ON admin_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_logs" ON admin_logs;
CREATE POLICY "admin_insert_logs" ON admin_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- ============ Incident clusters table ============
CREATE TABLE IF NOT EXISTS incident_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_lat double precision,
  center_lng double precision,
  radius_meters integer DEFAULT 500,
  report_ids text[] DEFAULT '{}',
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE incident_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_clusters" ON incident_clusters;
CREATE POLICY "admin_read_clusters" ON incident_clusters FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_manage_clusters" ON incident_clusters;
CREATE POLICY "admin_manage_clusters" ON incident_clusters FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ Report assignments table ============
CREATE TABLE IF NOT EXISTS report_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL,
  department text NOT NULL,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  notes text DEFAULT ''
);

ALTER TABLE report_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_assignments" ON report_assignments;
CREATE POLICY "admin_read_assignments" ON report_assignments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_assignments" ON report_assignments;
CREATE POLICY "admin_insert_assignments" ON report_assignments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_report_assignments_report_id ON report_assignments(report_id);

-- ============ Allow admins to update reports ============
DROP POLICY IF EXISTS "admin_update_reports" ON reports;
CREATE POLICY "admin_update_reports" ON reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Allow admins to delete reports
DROP POLICY IF EXISTS "admin_delete_reports" ON reports;
CREATE POLICY "admin_delete_reports" ON reports FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Allow admins to read ALL reports
DROP POLICY IF EXISTS "admin_read_all_reports" ON reports;
CREATE POLICY "admin_read_all_reports" ON reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
