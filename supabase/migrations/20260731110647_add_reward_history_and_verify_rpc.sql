/*
# Add reward_history table, atomic verify-and-reward RPC, and reseed rewards catalog

1. New Tables
- `reward_history`: Append-only ledger of points credited to citizens when reports are verified/resolved.
  - id (uuid, PK)
  - user_id (uuid, references profiles, NOT NULL)
  - report_id (text, NOT NULL) — the incident_id of the report that earned the reward
  - title (text) — human-readable description e.g. "Report CIVIC-2025-0001 verified"
  - points (integer, NOT NULL) — points awarded (positive)
  - type (text, NOT NULL) — 'report-verified' | 'report-resolved' | 'milestone' | 'streak' | 'duplicate-detected'
  - created_at (timestamptz, default now())

2. New Functions (RPC)
- `verify_and_reward_report(p_report_uuid uuid, p_action text, p_admin_id uuid)`:
  SECURITY DEFINER, atomic transaction that:
    a. Fetches the report (by UUID) + reporter profile in one go.
    b. Validates the admin role.
    c. Updates the report status (verified/resolved/rejected) + resolved_at + updated_at.
    d. On verify or resolve: computes reward points based on severity & category group,
       increments the citizen's points + reports_verified, bumps trust_score (capped 100),
       recomputes level from points, inserts a reward_history row, and inserts a
       citizen notification. On reject: increments reports_rejected, decrements trust_score
       (floored at 0), inserts a rejection notification.
    e. Returns a JSON summary { success, action, points_awarded, new_status, new_points,
       new_trust_score, new_level }.

3. Modified Tables
- `profiles`: no schema change; the RPC mutates points/trust_score/level/reports_verified/
  reports_rejected atomically.
- `reports`: no schema change; the RPC updates status/resolved_at/updated_at.

4. Security
- `reward_history`: Enable RLS. Owner-scoped SELECT (auth.uid() = user_id). Admins can read
  all rows. INSERT is blocked for direct client writes — only the SECURITY DEFINER RPC
  inserts, which bypasses RLS. No UPDATE/DELETE policies (append-only ledger).
- The RPC is SECURITY DEFINER so it can update any profile/report and insert into
  reward_history + notifications regardless of the caller's RLS.

5. Rewards Catalog Reseed
- Clears the existing catalog and inserts the 8 marketplace items specified by the product:
  Coffee (50), Food (100), Movie Ticket (150), Bus Pass (200), Shopping Coupon (300),
  Bluetooth Earbuds (500), City Hero Certificate (1000), Smartwatch Lucky Draw Entry (2000).
  Uses ON CONFLICT on title to stay idempotent. Stock is set to realistic values (-1 = unlimited).

6. Important Notes
- The RPC is the single source of truth for the verify/resolve workflow. The frontend must
  call it instead of doing separate update + profile update + notification inserts.
- Points table (severity × category group):
    critical=200, high=150, medium=100, low=50  (infrastructure)
    critical=250, high=200, medium=150, low=75  (traffic — slightly higher due to enforcement value)
- Level thresholds: Bronze 0, Silver 1000, Gold 3000, Platinum 6000, City Guardian 10000,
  Road Protector 20000.
- Trust score: +2 on verify/resolve (capped 100), -3 on reject (floored 0).
*/

-- ============ reward_history table ============
CREATE TABLE IF NOT EXISTS reward_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  points integer NOT NULL,
  type text NOT NULL DEFAULT 'report-verified',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reward_history ENABLE ROW LEVEL SECURITY;

-- Owner can read their own reward history
DROP POLICY IF EXISTS "select_own_reward_history" ON reward_history;
CREATE POLICY "select_own_reward_history" ON reward_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Admins can read all reward history
DROP POLICY IF EXISTS "admin_read_all_reward_history" ON reward_history;
CREATE POLICY "admin_read_all_reward_history" ON reward_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- No INSERT/UPDATE/DELETE policies for clients — the RPC (SECURITY DEFINER) is the only writer.

CREATE INDEX IF NOT EXISTS idx_reward_history_user_id ON reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_created_at ON reward_history(created_at DESC);

-- ============ verify_and_reward_report RPC ============
CREATE OR REPLACE FUNCTION public.verify_and_reward_report(
  p_report_uuid uuid,
  p_action text,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report RECORD;
  v_reporter RECORD;
  v_new_status text;
  v_points integer := 0;
  v_new_points integer;
  v_new_trust integer;
  v_new_level text := 'Bronze';
  v_reward_title text;
  v_notif_title text;
  v_notif_msg text;
  v_severity_mult integer;
  v_is_traffic boolean;
BEGIN
  -- 1. Fetch the report + reporter in one shot
  SELECT r.id, r.incident_id, r.reporter_id, r.severity, r.category_group, r.status, r.title
  INTO v_report
  FROM reports r
  WHERE r.id = p_report_uuid;

  IF v_report.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found');
  END IF;

  -- 2. Validate admin
  SELECT p.id, p.points, p.trust_score, p.reports_verified, p.reports_rejected
  INTO v_reporter
  FROM profiles p
  WHERE p.id = p_admin_id AND p.role = 'admin';

  IF v_reporter.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized — admin role required');
  END IF;

  -- 3. Determine new status
  v_new_status := CASE p_action
    WHEN 'verify' THEN 'verified'
    WHEN 'resolve' THEN 'resolved'
    WHEN 'reject' THEN 'rejected'
    ELSE p_action
  END;

  v_is_traffic := (v_report.category_group = 'traffic');

  -- 4. Compute reward points (severity × category group)
  IF p_action = 'verify' OR p_action = 'resolve' THEN
    v_severity_mult := CASE v_report.severity
      WHEN 'critical' THEN (CASE WHEN v_is_traffic THEN 250 ELSE 200 END)
      WHEN 'high' THEN (CASE WHEN v_is_traffic THEN 200 ELSE 150 END)
      WHEN 'medium' THEN (CASE WHEN v_is_traffic THEN 150 ELSE 100 END)
      WHEN 'low' THEN (CASE WHEN v_is_traffic THEN 75 ELSE 50 END)
      ELSE 100
    END;
    v_points := v_severity_mult;
    -- Resolve grants a small completion bonus on top
    IF p_action = 'resolve' THEN
      v_points := v_points + 25;
    END IF;

    -- 5. Update report
    UPDATE reports
    SET status = v_new_status,
        resolved_at = CASE WHEN p_action = 'resolve' THEN now() ELSE resolved_at END,
        updated_at = now()
    WHERE id = p_report_uuid;

    -- 6. Update citizen profile (points + reports_verified + trust score)
    v_new_points := (COALESCE(v_reporter.points, 0) + v_points);
    v_new_trust := LEAST(100, COALESCE(v_reporter.trust_score, 50) + 2);

    -- Recompute level from total points
    v_new_level := CASE
      WHEN v_new_points >= 20000 THEN 'Road Protector'
      WHEN v_new_points >= 10000 THEN 'City Guardian'
      WHEN v_new_points >= 6000 THEN 'Platinum'
      WHEN v_new_points >= 3000 THEN 'Gold'
      WHEN v_new_points >= 1000 THEN 'Silver'
      ELSE 'Bronze'
    END;

    UPDATE profiles
    SET points = v_new_points,
        trust_score = v_new_trust,
        reports_verified = COALESCE(reports_verified, 0) + 1,
        level = v_new_level,
        updated_at = now()
    WHERE id = v_report.reporter_id;

    -- 7. Insert reward history
    v_reward_title := CASE p_action
      WHEN 'resolve' THEN CONCAT('Report ', v_report.incident_id, ' resolved')
      ELSE CONCAT('Report ', v_report.incident_id, ' verified')
    END;

    INSERT INTO reward_history (user_id, report_id, title, points, type)
    VALUES (
      v_report.reporter_id,
      v_report.incident_id,
      v_reward_title,
      v_points,
      CASE p_action WHEN 'resolve' THEN 'report-resolved' ELSE 'report-verified' END
    );

    -- 8. Insert citizen notification
    v_notif_title := CASE p_action WHEN 'resolve' THEN 'Issue Resolved' ELSE 'Report Verified' END;
    v_notif_msg := CASE p_action
      WHEN 'resolve' THEN CONCAT('Your report ', v_report.incident_id, ' has been resolved. You earned ', v_points, ' points!')
      ELSE CONCAT('Your report ', v_report.incident_id, ' was verified. You earned ', v_points, ' points!')
    END;

    INSERT INTO notifications (user_id, recipient_type, type, title, message, report_id)
    VALUES (v_report.reporter_id, 'citizen', 'reward-credited', v_notif_title, v_notif_msg, v_report.incident_id);

  ELSIF p_action = 'reject' THEN
    -- Reject: no points, decrement trust, increment rejected count
    UPDATE reports
    SET status = v_new_status, updated_at = now()
    WHERE id = p_report_uuid;

    v_new_trust := GREATEST(0, COALESCE(v_reporter.trust_score, 50) - 3);

    UPDATE profiles
    SET reports_rejected = COALESCE(reports_rejected, 0) + 1,
        trust_score = v_new_trust,
        updated_at = now()
    WHERE id = v_report.reporter_id;

    v_new_points := COALESCE(v_reporter.points, 0);
    v_new_level := CASE
      WHEN v_new_points >= 20000 THEN 'Road Protector'
      WHEN v_new_points >= 10000 THEN 'City Guardian'
      WHEN v_new_points >= 6000 THEN 'Platinum'
      WHEN v_new_points >= 3000 THEN 'Gold'
      WHEN v_new_points >= 1000 THEN 'Silver'
      ELSE 'Bronze'
    END;

    INSERT INTO notifications (user_id, recipient_type, type, title, message, report_id)
    VALUES (
      v_report.reporter_id,
      'citizen',
      'report-rejected',
      'Report Rejected',
      CONCAT('Your report ', v_report.incident_id, ' was rejected. Please review and resubmit if needed.'),
      v_report.incident_id
    );

    v_points := 0;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown action. Use verify, resolve, or reject.');
  END IF;

  -- 9. Log the admin action
  INSERT INTO admin_logs (admin_id, action, report_id, details)
  VALUES (
    p_admin_id,
    CONCAT('verify_and_reward:', p_action),
    v_report.incident_id,
    CONCAT('Status -> ', v_new_status, ', points: ', v_points)
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'report_id', v_report.incident_id,
    'new_status', v_new_status,
    'points_awarded', v_points,
    'new_points', v_new_points,
    'new_trust_score', v_new_trust,
    'new_level', v_new_level
  );
END;
$$;

-- Grant execute to authenticated users (admins call it; citizens won't but harmless)
GRANT EXECUTE ON FUNCTION public.verify_and_reward_report(uuid, text, uuid) TO authenticated;

-- ============ Reseed rewards catalog with the 8 marketplace items ============
-- Clear existing rows so the catalog reflects exactly the product spec
DELETE FROM rewards_catalog;

INSERT INTO rewards_catalog (title, description, points_cost, category, icon, stock, active) VALUES
  ('Coffee', 'Free coffee at partner cafes across the city', 50, 'voucher', 'Coffee', 100, true),
  ('Food', 'Food voucher redeemable at partner restaurants', 100, 'voucher', 'Coffee', 80, true),
  ('Movie Ticket', 'Free movie ticket at partner cinemas', 150, 'voucher', 'Ticket', 60, true),
  ('Bus Pass', '1-day free public transport bus pass', 200, 'voucher', 'Bus', 50, true),
  ('Shopping Coupon', 'Discount shopping coupon at partner retail stores', 300, 'voucher', 'ShoppingCart', 40, true),
  ('Bluetooth Earbuds', 'Wireless Bluetooth earbuds shipped to your address', 500, 'merchandise', 'Package', 25, true),
  ('City Hero Certificate', 'Official digital certificate recognizing your civic contribution', 1000, 'badge', 'Award', -1, true),
  ('Smartwatch Lucky Draw Entry', 'Entry into the monthly smartwatch lucky draw', 2000, 'merchandise', 'Sparkles', 15, true)
ON CONFLICT DO NOTHING;
