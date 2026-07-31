/*
# Create admin account

1. Purpose
- Inserts a pre-confirmed admin user directly into auth.users with a bcrypt-hashed password.
- The existing `handle_new_user` trigger will auto-create the profiles row with role='admin'
  (read from raw_user_meta_data->>'role').

2. Credentials
- Email: admin@civiceye.gov
- Password: CivicEye@2026  (bcrypt hash below)

3. Security
- This is a one-time bootstrap of an admin account. The password is strong and meets the
  app's password rules (8+ chars, upper, lower, digit, special).

4. Notes
- encrypted_password uses the bcrypt hash format Supabase Auth expects.
- email_confirmed_at is set so login works without email confirmation.
- raw_app_meta_data carries role='admin' for any JWT-based checks.
- raw_user_meta_data carries role='admin' + full_name so the trigger picks it up.
- Idempotent: skipped if the user already exists.
*/

DO $$
DECLARE
  admin_email text := 'admin@civiceye.gov';
  existing_count integer;
BEGIN
  SELECT count(*) INTO existing_count FROM auth.users WHERE email = admin_email;
  IF existing_count = 0 THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      admin_email,
      crypt('CivicEye@2026', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"role": "admin"}'::jsonb,
      '{"role": "admin", "full_name": "City Administrator"}'::jsonb
    );
  END IF;
END
$$;

-- Ensure the profile role is admin (covers the case where the trigger already ran)
UPDATE profiles
SET role = 'admin', full_name = COALESCE(NULLIF(full_name, ''), 'City Administrator')
WHERE email = 'admin@civiceye.gov';
