/*
# Create profiles, rewards catalog, and redemptions tables

1. New Tables
- `profiles`: Stores citizen profile data (points, trust score, level, rank) linked to auth.users.
  - `id` (uuid, PK, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text)
  - `avatar_url` (text)
  - `phone` (text)
  - `city` (text)
  - `points` (integer, default 0)
  - `trust_score` (integer, default 50)
  - `level` (text, default 'Bronze')
  - `reports_submitted` (integer, default 0)
  - `reports_verified` (integer, default 0)
  - `reports_rejected` (integer, default 0)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `rewards_catalog`: Catalog of redeemable rewards.
  - `id` (uuid, PK)
  - `title` (text, not null)
  - `description` (text)
  - `points_cost` (integer, not null)
  - `category` (text) — e.g. 'voucher', 'badge', 'donation', 'merchandise'
  - `icon` (text)
  - `image_url` (text)
  - `stock` (integer, default -1 for unlimited)
  - `active` (boolean, default true)
  - `created_at` (timestamptz, default now())

- `redemptions`: Records of users redeeming rewards.
  - `id` (uuid, PK)
  - `user_id` (uuid, not null, references profiles, default auth.uid())
  - `reward_id` (uuid, not null, references rewards_catalog)
  - `reward_title` (text, not null)
  - `points_spent` (integer, not null)
  - `status` (text, default 'pending') — pending, fulfilled, cancelled
  - `redemption_code` (text) — unique code for voucher redemption
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on all tables.
- profiles: owner-scoped CRUD (auth.uid() = id).
- rewards_catalog: public read for anon+authenticated (catalog is shared); no user writes.
- redemptions: owner-scoped CRUD (auth.uid() = user_id).
3. Indexes
- redemptions(user_id) for fast per-user lookups.
- rewards_catalog(category) for filtering.
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  avatar_url text,
  phone text DEFAULT '',
  city text DEFAULT '',
  points integer NOT NULL DEFAULT 0,
  trust_score integer NOT NULL DEFAULT 50,
  level text NOT NULL DEFAULT 'Bronze',
  reports_submitted integer NOT NULL DEFAULT 0,
  reports_verified integer NOT NULL DEFAULT 0,
  reports_rejected integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Rewards catalog table
CREATE TABLE IF NOT EXISTS rewards_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  points_cost integer NOT NULL,
  category text NOT NULL DEFAULT 'voucher',
  icon text DEFAULT 'Gift',
  image_url text,
  stock integer NOT NULL DEFAULT -1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rewards_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_rewards_catalog" ON rewards_catalog;
CREATE POLICY "read_rewards_catalog" ON rewards_catalog FOR SELECT
  TO anon, authenticated USING (true);

-- Redemptions table
CREATE TABLE IF NOT EXISTS redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards_catalog(id) ON DELETE CASCADE,
  reward_title text NOT NULL,
  points_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  redemption_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_redemptions" ON redemptions;
CREATE POLICY "select_own_redemptions" ON redemptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_redemptions" ON redemptions;
CREATE POLICY "insert_own_redemptions" ON redemptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_redemptions" ON redemptions;
CREATE POLICY "update_own_redemptions" ON redemptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_catalog_category ON rewards_catalog(category);

-- Seed rewards catalog
INSERT INTO rewards_catalog (title, description, points_cost, category, icon, stock) VALUES
  ('Amazon Voucher ₹100', 'Redeem for a ₹100 Amazon shopping voucher', 500, 'voucher', 'ShoppingCart', 50),
  ('Amazon Voucher ₹500', 'Redeem for a ₹500 Amazon shopping voucher', 2000, 'voucher', 'ShoppingCart', 30),
  ('Petrol Voucher ₹200', 'Redeem for a ₹200 petrol voucher at partner stations', 800, 'voucher', 'Fuel', 40),
  ('Tree Plantation', 'Plant a tree in your name through city green initiative', 300, 'donation', 'TreePine', -1),
  ('City Guardian Badge', 'Exclusive digital badge for top contributors', 1000, 'badge', 'ShieldCheck', -1),
  ('CivicEye T-Shirt', 'Official CivicEye AI merchandise t-shirt', 3000, 'merchandise', 'Shirt', 20),
  ('Coffee Voucher', 'Free coffee at partner cafes', 250, 'voucher', 'Coffee', 100),
  ('Swag Kit', 'CivicEye stickers, notebook, and pen set', 1500, 'merchandise', 'Package', 15),
  ('Charity Donation ₹50', 'Donate ₹50 to a city welfare charity', 200, 'donation', 'Heart', -1),
  ('Public Transport Pass', '1-day free public transport pass', 400, 'voucher', 'Bus', 50)
ON CONFLICT DO NOTHING;
