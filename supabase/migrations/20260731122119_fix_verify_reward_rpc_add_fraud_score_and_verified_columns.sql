-- 1. Add missing columns to reports table
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS fraud_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_count integer DEFAULT 0;

-- 2. Fix the verify_and_reward_report RPC.
--    BUG: the original function fetched the ADMIN's profile as v_reporter
--    and computed new_points/new_trust from the admin's values, then wrote
--    those to the citizen's profile. The citizen ended up with the admin's
--    points + the award. This rewrite fetches the reporter (citizen)
--    separately from the admin validation, so points and trust are computed
--    from the citizen's actual current values.

CREATE OR REPLACE FUNCTION public.verify_and_reward_report(
  p_report_uuid uuid,
  p_action text,
  p_admin_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_report RECORD;
  v_reporter RECORD;
  v_admin RECORD;
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
  -- 1. Fetch the report
  SELECT r.id, r.incident_id, r.reporter_id, r.severity, r.category_group, r.status, r.title
  INTO v_report
  FROM reports r
  WHERE r.id = p_report_uuid;

  IF v_report.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found');
  END IF;

  -- 2. Validate that the caller is an admin (separate from reporter)
  SELECT p.id INTO v_admin
  FROM profiles p
  WHERE p.id = p_admin_id AND p.role = 'admin';

  IF v_admin.id IS NULL THEN
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

  IF p_action = 'verify' OR p_action = 'resolve' THEN

    -- 4. Compute reward points (severity x category group)
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

    -- 5. Update report status + verification metadata
    UPDATE reports
    SET status = v_new_status,
        resolved_at = CASE WHEN p_action = 'resolve' THEN now() ELSE resolved_at END,
        verified_at = CASE WHEN p_action = 'verify' THEN now() ELSE verified_at END,
        verified_by = p_admin_id,
        updated_at = now()
    WHERE id = p_report_uuid;

    -- 6. Fetch the CITIZEN reporter's current profile (NOT the admin's)
    SELECT p.points, p.trust_score, p.reports_verified, p.reports_rejected
    INTO v_reporter
    FROM profiles p
    WHERE p.id = v_report.reporter_id;

    IF v_reporter.points IS NULL THEN
      -- Reporter profile doesn't exist; still succeed on the report update
      RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'report_id', v_report.incident_id,
        'new_status', v_new_status,
        'points_awarded', v_points,
        'new_points', 0,
        'new_trust_score', 0,
        'new_level', 'Bronze'
      );
    END IF;

    -- 7. Compute new points, trust, and level from the CITIZEN's values
    v_new_points := (COALESCE(v_reporter.points, 0) + v_points);
    v_new_trust := LEAST(100, COALESCE(v_reporter.trust_score, 50) + 2);

    v_new_level := CASE
      WHEN v_new_points >= 20000 THEN 'Road Protector'
      WHEN v_new_points >= 10000 THEN 'City Guardian'
      WHEN v_new_points >= 6000 THEN 'Platinum'
      WHEN v_new_points >= 3000 THEN 'Gold'
      WHEN v_new_points >= 1000 THEN 'Silver'
      ELSE 'Bronze'
    END;

    -- 8. Update the CITIZEN's profile
    UPDATE profiles
    SET points = v_new_points,
        trust_score = v_new_trust,
        reports_verified = COALESCE(reports_verified, 0) + 1,
        level = v_new_level,
        updated_at = now()
    WHERE id = v_report.reporter_id;

    -- 9. Insert reward history
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

    -- 10. Insert citizen notification
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

    -- Fetch the CITIZEN's profile for correct trust computation
    SELECT p.points, p.trust_score, p.reports_verified, p.reports_rejected
    INTO v_reporter
    FROM profiles p
    WHERE p.id = v_report.reporter_id;

    v_new_trust := GREATEST(0, COALESCE(v_reporter.trust_score, 50) - 3);
    v_new_points := COALESCE(v_reporter.points, 0);

    v_new_level := CASE
      WHEN v_new_points >= 20000 THEN 'Road Protector'
      WHEN v_new_points >= 10000 THEN 'City Guardian'
      WHEN v_new_points >= 6000 THEN 'Platinum'
      WHEN v_new_points >= 3000 THEN 'Gold'
      WHEN v_new_points >= 1000 THEN 'Silver'
      ELSE 'Bronze'
    END;

    UPDATE profiles
    SET reports_rejected = COALESCE(reports_rejected, 0) + 1,
        trust_score = v_new_trust,
        level = v_new_level,
        updated_at = now()
    WHERE id = v_report.reporter_id;

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

  -- 11. Log the admin action
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
$function$;

-- 3. Add a function to auto-reduce trust score when a user submits invalid reports.
--    Called from the report submission flow when AI flags an image as invalid.
CREATE OR REPLACE FUNCTION public.reduce_trust_for_invalid_report(
  p_user_id uuid,
  p_reason text DEFAULT 'invalid-report'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_trust integer;
  v_new_trust integer;
  v_invalid_count integer;
  v_new_fraud_score integer;
BEGIN
  SELECT trust_score, reports_rejected INTO v_current_trust, v_invalid_count
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Each invalid report reduces trust by 5 points (min 0)
  v_new_trust := GREATEST(0, COALESCE(v_current_trust, 50) - 5);

  -- Compute a rolling fraud score: more invalid reports = higher fraud score
  v_invalid_count := COALESCE(v_invalid_count, 0) + 1;
  v_new_fraud_score := LEAST(100, v_invalid_count * 15);

  UPDATE profiles
  SET trust_score = v_new_trust,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_trust_score', v_new_trust,
    'fraud_score', v_new_fraud_score,
    'reason', p_reason
  );
END;
$function$;
