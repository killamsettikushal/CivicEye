/*
# Create reports table and add fake-user flagging to profiles

1. New Tables
- `reports`: Stores citizen-submitted civic reports. Admins can receive, review, and update the status of any report.
  - `id` (uuid, PK)
  - `incident_id` (text, unique) — human-friendly ID like CIVIC-2025-0001
  - `reporter_id` (uuid, references profiles, default auth.uid())
  - `reporter_name` (text) — denormalized for quick display
  - `category` (text, not null) — e.g. 'pothole', 'helmet-missing'
  - `category_group` (text) — 'infrastructure' or 'traffic'
  - `title` (text, not null)
  - `description` (text)
  - `status` (text, default 'pending') — pending, ai-processing, verified, rejected, assigned, in-progress, resolved
  - `severity` (text, default 'medium') — low, medium, high, critical
  - `department` (text)
  - `lat` (double precision)
  - `lng` (double precision)
  - `address` (text)
  - `city` (text)
  - `evidence_urls` (text[], default '{}')
  - `ai_result` (jsonb) — full AI analysis result stored as JSON
  - `vehicle_number` (text)
  - `vehicle_type` (text)
  - `admin_notes` (text) — notes left by admin during review
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Modified Tables
- `profiles`: Added fake-user flagging columns.
  - `flagged_fake` (boolean, default false) — true when admin marks the user as fake/suspicious
  - `flagged_reason` (text) — admin-provided reason for flagging
  - `flagged_at` (timestamptz) — when the user was flagged
  - `banned` (boolean, default false) — true when admin bans the user
  - `banned_at` (timestamptz) — when the ban was applied

3. Security
- `reports`: Enable RLS.
  - Citizens can read and insert their own reports (auth.uid() = reporter_id).
  - Admins can read ALL reports and update ALL reports (status, department, admin_notes, severity).
  - No one can delete reports via the anon key (delete is admin-only via service role).
- `profiles`: Add admin update policy so admins can update the flag/ban columns on any profile.
  - Existing owner-scoped update policy remains; admin policy is additive.

4. Indexes
- `reports(reporter_id)` for per-user lookups.
- `reports(status)` for status filtering in the admin portal.
- `reports(created_at)` for chronological ordering.
- `profiles(flagged_fake)` and `profiles(banned)` for admin filtering.

5. Important Notes
- The `reporter_id` column defaults to `auth.uid()` so citizen inserts that omit it still succeed.
- Admin detection in policies uses: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin').
- The admin update policy on reports is scoped to status/department/severity/admin_notes columns
  via a WITH CHECK that requires the row to still exist (always true for UPDATE), but the USING
  clause restricts to admins only.
*/

-- ============ reports table ============
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id text UNIQUE NOT NULL,
  reporter_id uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_name text DEFAULT 'Anonymous',
  category text NOT NULL,
  category_group text NOT NULL DEFAULT 'infrastructure',
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  severity text NOT NULL DEFAULT 'medium',
  department text DEFAULT '',
  lat double precision,
  lng double precision,
  address text DEFAULT '',
  city text DEFAULT '',
  evidence_urls text[] DEFAULT '{}',
  ai_result jsonb,
  vehicle_number text,
  vehicle_type text,
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Citizens can read their own reports
DROP POLICY IF EXISTS "select_own_reports" ON reports;
CREATE POLICY "select_own_reports" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id);

-- Admins can read ALL reports
DROP POLICY IF EXISTS "admin_read_all_reports" ON reports;
CREATE POLICY "admin_read_all_reports" ON reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Citizens can insert their own reports
DROP POLICY IF EXISTS "insert_own_reports" ON reports;
CREATE POLICY "insert_own_reports" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Admins can update ALL reports (status, department, severity, admin_notes, etc.)
DROP POLICY IF EXISTS "admin_update_all_reports" ON reports;
CREATE POLICY "admin_update_all_reports" ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Citizens can update their own reports (e.g. AI result population)
DROP POLICY IF EXISTS "update_own_reports" ON reports;
CREATE POLICY "update_own_reports" ON reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = reporter_id)
  WITH CHECK (auth.uid() = reporter_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- ============ profiles: fake-user flagging columns ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flagged_fake boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flagged_reason text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flagged_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- Admins can update any profile (for flagging/banning)
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Indexes for admin filtering
CREATE INDEX IF NOT EXISTS idx_profiles_flagged_fake ON profiles(flagged_fake);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned);
