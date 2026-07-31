/*
# Enhance Community module: groups, events, announcements, reactions, drafts, blocks, mutes, achievements, streaks, notification prefs

1. New Tables
- `community_groups`: Locality/interest-based groups users can join.
- `community_group_members`: Membership (join/leave).
- `community_events`: Cleanliness drives, awareness campaigns with RSVP.
- `community_event_rsvps`: RSVP status per user per event.
- `community_announcements`: Admin-pinned announcements.
- `community_reactions`: Emoji reactions on posts (beyond likes).
- `community_comment_reactions`: Emoji reactions on comments.
- `community_drafts`: Draft posts saved for later.
- `community_blocks`: Block relationships between users.
- `community_mutes`: Mute conversations (posts) per user.
- `community_achievements`: Achievement/badge definitions.
- `community_user_achievements`: Earned achievements per user.
- `community_streaks`: Daily participation streak per user.
- `community_notification_prefs`: Per-user notification preferences.

2. Modified Tables
- `community_posts`: Added is_pinned, pinned_by, group_id, scheduled_at, link_preview columns.
- `community_comments`: Added reactions_count column.

3. Security
- RLS on all new tables.
- Groups: public read; insert/update/delete by owner or admin.
- Group members: public read; insert/delete own membership.
- Events: public read; insert/update/delete by creator or admin.
- Event RSVPs: public read; insert/update/delete own RSVP.
- Announcements: public read; insert/update/delete by admin only.
- Reactions: public read; insert/delete own.
- Drafts: owner-scoped only.
- Blocks: owner-scoped only.
- Mutes: owner-scoped only.
- Achievements: public read; insert/update/delete by admin.
- User achievements: public read; insert own (awarded by system) / admin insert.
- Streaks: owner-scoped read; insert/update own.
- Notification prefs: owner-scoped.

4. Indexes
- community_groups(slug), (city), (category).
- community_group_members(group_id), (user_id).
- community_events(group_id), (starts_at), (city).
- community_event_rsvps(event_id), (user_id).
- community_announcements(pinned, created_at).
- community_reactions(post_id), (user_id).
- community_comment_reactions(comment_id), (user_id).
- community_drafts(user_id), (updated_at).
- community_blocks(blocker_id), (blocked_id).
- community_mutes(user_id), (post_id).
- community_user_achievements(user_id), (achievement_id).
- community_streaks(user_id).
- community_notification_prefs(user_id).

5. Important Notes
- Reactions are separate from likes (community_likes). Reactions use emoji types: like, love, wow, celebrate.
- One reaction per user per post (unique constraint). Changing reaction = update.
- Drafts are private to the user.
- Blocked users' posts are filtered client-side by the service layer.
- Muted posts don't appear in the user's feed (filtered client-side).
- Streaks track consecutive days of activity (post, comment, or vote).
- Notification prefs allow granular control per notification type.
- Scheduled posts have scheduled_at set; the service excludes them from the feed until the time arrives.
*/

-- ============ community_groups ============
CREATE TABLE IF NOT EXISTS community_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'locality',
  city text DEFAULT '',
  icon text DEFAULT 'Users',
  cover_url text,
  member_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_groups" ON community_groups;
CREATE POLICY "read_all_groups" ON community_groups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_group" ON community_groups;
CREATE POLICY "insert_own_group" ON community_groups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_own_group" ON community_groups;
CREATE POLICY "update_own_group" ON community_groups FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "admin_update_group" ON community_groups;
CREATE POLICY "admin_update_group" ON community_groups FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_own_group" ON community_groups;
CREATE POLICY "delete_own_group" ON community_groups FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "admin_delete_group" ON community_groups;
CREATE POLICY "admin_delete_group" ON community_groups FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_community_groups_slug ON community_groups(slug);
CREATE INDEX IF NOT EXISTS idx_community_groups_city ON community_groups(city);
CREATE INDEX IF NOT EXISTS idx_community_groups_category ON community_groups(category);

-- ============ community_group_members ============
CREATE TABLE IF NOT EXISTS community_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE community_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_group_members" ON community_group_members;
CREATE POLICY "read_all_group_members" ON community_group_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_membership" ON community_group_members;
CREATE POLICY "insert_own_membership" ON community_group_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_membership" ON community_group_members;
CREATE POLICY "delete_own_membership" ON community_group_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_group_members_group_id ON community_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_community_group_members_user_id ON community_group_members(user_id);

-- ============ community_events ============
CREATE TABLE IF NOT EXISTS community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'cleanliness-drive',
  group_id uuid REFERENCES community_groups(id) ON DELETE SET NULL,
  organizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  location_name text DEFAULT '',
  lat double precision,
  lng double precision,
  city text DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  banner_url text,
  max_attendees integer DEFAULT -1,
  rsvp_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_events" ON community_events;
CREATE POLICY "read_all_events" ON community_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_event" ON community_events;
CREATE POLICY "insert_own_event" ON community_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "update_own_event" ON community_events;
CREATE POLICY "update_own_event" ON community_events FOR UPDATE
  TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "admin_update_event" ON community_events;
CREATE POLICY "admin_update_event" ON community_events FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_own_event" ON community_events;
CREATE POLICY "delete_own_event" ON community_events FOR DELETE
  TO authenticated USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "admin_delete_event" ON community_events;
CREATE POLICY "admin_delete_event" ON community_events FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_community_events_group_id ON community_events(group_id);
CREATE INDEX IF NOT EXISTS idx_community_events_starts_at ON community_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_community_events_city ON community_events(city);

-- ============ community_event_rsvps ============
CREATE TABLE IF NOT EXISTS community_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE community_event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_rsvps" ON community_event_rsvps;
CREATE POLICY "read_all_rsvps" ON community_event_rsvps FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_rsvp" ON community_event_rsvps;
CREATE POLICY "insert_own_rsvp" ON community_event_rsvps FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_rsvp" ON community_event_rsvps;
CREATE POLICY "update_own_rsvp" ON community_event_rsvps FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_rsvp" ON community_event_rsvps;
CREATE POLICY "delete_own_rsvp" ON community_event_rsvps FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_event_rsvps_event_id ON community_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_community_event_rsvps_user_id ON community_event_rsvps(user_id);

-- ============ community_announcements ============
CREATE TABLE IF NOT EXISTS community_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  pinned boolean NOT NULL DEFAULT true,
  group_id uuid REFERENCES community_groups(id) ON DELETE CASCADE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_announcements" ON community_announcements;
CREATE POLICY "read_all_announcements" ON community_announcements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_announcement" ON community_announcements;
CREATE POLICY "admin_insert_announcement" ON community_announcements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_announcement" ON community_announcements;
CREATE POLICY "admin_update_announcement" ON community_announcements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_announcement" ON community_announcements;
CREATE POLICY "admin_delete_announcement" ON community_announcements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_community_announcements_pinned ON community_announcements(pinned, created_at DESC);

-- ============ community_reactions (post-level emoji reactions) ============
CREATE TABLE IF NOT EXISTS community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_reactions" ON community_reactions;
CREATE POLICY "read_all_reactions" ON community_reactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reaction" ON community_reactions;
CREATE POLICY "insert_own_reaction" ON community_reactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reaction" ON community_reactions;
CREATE POLICY "update_own_reaction" ON community_reactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reaction" ON community_reactions;
CREATE POLICY "delete_own_reaction" ON community_reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_reactions_post_id ON community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_user_id ON community_reactions(user_id);

-- ============ community_comment_reactions ============
CREATE TABLE IF NOT EXISTS community_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE community_comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_comment_reactions" ON community_comment_reactions;
CREATE POLICY "read_all_comment_reactions" ON community_comment_reactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_comment_reaction" ON community_comment_reactions;
CREATE POLICY "insert_own_comment_reaction" ON community_comment_reactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_comment_reaction" ON community_comment_reactions;
CREATE POLICY "update_own_comment_reaction" ON community_comment_reactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_comment_reaction" ON community_comment_reactions;
CREATE POLICY "delete_own_comment_reaction" ON community_comment_reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_comment_reactions_comment_id ON community_comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comment_reactions_user_id ON community_comment_reactions(user_id);

-- ============ community_drafts ============
CREATE TABLE IF NOT EXISTS community_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text DEFAULT '',
  media_urls text[] NOT NULL DEFAULT '{}',
  media_types text[] NOT NULL DEFAULT '{}',
  location_name text DEFAULT '',
  lat double precision,
  lng double precision,
  poll_data jsonb,
  group_id uuid,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_drafts" ON community_drafts;
CREATE POLICY "select_own_drafts" ON community_drafts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_draft" ON community_drafts;
CREATE POLICY "insert_own_draft" ON community_drafts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_draft" ON community_drafts;
CREATE POLICY "update_own_draft" ON community_drafts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_draft" ON community_drafts;
CREATE POLICY "delete_own_draft" ON community_drafts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_drafts_user_id ON community_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_drafts_updated_at ON community_drafts(updated_at DESC);

-- ============ community_blocks ============
CREATE TABLE IF NOT EXISTS community_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE community_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_blocks" ON community_blocks;
CREATE POLICY "select_own_blocks" ON community_blocks FOR SELECT
  TO authenticated USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "insert_own_block" ON community_blocks;
CREATE POLICY "insert_own_block" ON community_blocks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "delete_own_block" ON community_blocks;
CREATE POLICY "delete_own_block" ON community_blocks FOR DELETE
  TO authenticated USING (auth.uid() = blocker_id);

CREATE INDEX IF NOT EXISTS idx_community_blocks_blocker_id ON community_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_community_blocks_blocked_id ON community_blocks(blocked_id);

-- ============ community_mutes ============
CREATE TABLE IF NOT EXISTS community_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE community_mutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_mutes" ON community_mutes;
CREATE POLICY "select_own_mutes" ON community_mutes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_mute" ON community_mutes;
CREATE POLICY "insert_own_mute" ON community_mutes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_mute" ON community_mutes;
CREATE POLICY "delete_own_mute" ON community_mutes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_mutes_user_id ON community_mutes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_mutes_post_id ON community_mutes(post_id);

-- ============ community_achievements ============
CREATE TABLE IF NOT EXISTS community_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  title text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Award',
  category text DEFAULT 'contribution',
  threshold integer DEFAULT 1,
  points integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_achievements" ON community_achievements;
CREATE POLICY "read_all_achievements" ON community_achievements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_achievement" ON community_achievements;
CREATE POLICY "admin_insert_achievement" ON community_achievements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_achievement" ON community_achievements;
CREATE POLICY "admin_update_achievement" ON community_achievements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Seed default achievements
INSERT INTO community_achievements (name, title, description, icon, category, threshold, points) VALUES
  ('first_post', 'First Post', 'Published your first community post', 'FileText', 'contribution', 1, 10),
  ('ten_posts', 'Active Voice', 'Published 10 community posts', 'MessageSquare', 'contribution', 10, 50),
  ('fifty_posts', 'Community Champion', 'Published 50 community posts', 'Trophy', 'contribution', 50, 200),
  ('first_comment', 'Conversation Starter', 'Posted your first comment', 'MessageCircle', 'engagement', 1, 5),
  ('ten_comments', 'Discussion Pro', 'Posted 10 comments', 'MessagesSquare', 'engagement', 10, 30),
  ('first_poll', 'Pollster', 'Created your first poll', 'BarChart3', 'engagement', 1, 15),
  ('first_event', 'Event Organizer', 'Organized your first event', 'Calendar', 'events', 1, 25),
  ('first_group', 'Community Builder', 'Created your first group', 'Users', 'groups', 1, 25),
  ('streak_7', 'Week Warrior', '7-day participation streak', 'Flame', 'streak', 7, 50),
  ('streak_30', 'Monthly Dedication', '30-day participation streak', 'Flame', 'streak', 30, 200),
  ('first_like', 'Getting Noticed', 'Received your first like', 'Heart', 'recognition', 1, 5),
  ('ten_likes', 'Rising Star', 'Received 10 total likes', 'Star', 'recognition', 10, 30),
  ('fifty_likes', 'Community Favorite', 'Received 50 total likes', 'Award', 'recognition', 50, 100)
ON CONFLICT (name) DO NOTHING;

-- ============ community_user_achievements ============
CREATE TABLE IF NOT EXISTS community_user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES community_achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE community_user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_user_achievements" ON community_user_achievements;
CREATE POLICY "read_all_user_achievements" ON community_user_achievements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_user_achievement" ON community_user_achievements;
CREATE POLICY "insert_own_user_achievement" ON community_user_achievements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_insert_user_achievement" ON community_user_achievements;
CREATE POLICY "admin_insert_user_achievement" ON community_user_achievements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_community_user_achievements_user_id ON community_user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_community_user_achievements_achievement_id ON community_user_achievements(achievement_id);

-- ============ community_streaks ============
CREATE TABLE IF NOT EXISTS community_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date NOT NULL DEFAULT CURRENT_DATE,
  total_active_days integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE community_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_streak" ON community_streaks;
CREATE POLICY "select_own_streak" ON community_streaks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_streak" ON community_streaks;
CREATE POLICY "insert_own_streak" ON community_streaks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_streak" ON community_streaks;
CREATE POLICY "update_own_streak" ON community_streaks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_streaks_user_id ON community_streaks(user_id);

-- ============ community_notification_prefs ============
CREATE TABLE IF NOT EXISTS community_notification_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  notify_likes boolean NOT NULL DEFAULT true,
  notify_comments boolean NOT NULL DEFAULT true,
  notify_mentions boolean NOT NULL DEFAULT true,
  notify_follows boolean NOT NULL DEFAULT true,
  notify_poll_results boolean NOT NULL DEFAULT true,
  notify_announcements boolean NOT NULL DEFAULT true,
  notify_events boolean NOT NULL DEFAULT true,
  notify_group_updates boolean NOT NULL DEFAULT true,
  email_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE community_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notif_prefs" ON community_notification_prefs;
CREATE POLICY "select_own_notif_prefs" ON community_notification_prefs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notif_prefs" ON community_notification_prefs;
CREATE POLICY "insert_own_notif_prefs" ON community_notification_prefs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notif_prefs" ON community_notification_prefs;
CREATE POLICY "update_own_notif_prefs" ON community_notification_prefs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_notification_prefs_user_id ON community_notification_prefs(user_id);

-- ============ Alter community_posts: add pin, group, scheduling, link preview ============
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES community_groups(id) ON DELETE SET NULL;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS link_title text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS link_description text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS link_image text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS landmark text DEFAULT '';

-- Admin can pin/unpin posts
DROP POLICY IF EXISTS "admin_pin_post" ON community_posts;
CREATE POLICY "admin_pin_post" ON community_posts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_community_posts_is_pinned ON community_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_community_posts_group_id ON community_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_scheduled_at ON community_posts(scheduled_at);

-- ============ Alter community_comments: add reactions_count ============
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS reactions_count integer NOT NULL DEFAULT 0;

-- ============ RPC: update streak on activity ============
CREATE OR REPLACE FUNCTION public.update_community_streak(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak integer;
  v_last_date date;
  v_today date := CURRENT_DATE;
  v_yesterday date := CURRENT_DATE - 1;
BEGIN
  SELECT current_streak, last_active_date INTO v_streak, v_last_date
  FROM community_streaks WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO community_streaks (user_id, current_streak, longest_streak, last_active_date, total_active_days)
    VALUES (p_user_id, 1, 1, v_today, 1)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN 1;
  END IF;

  IF v_last_date = v_today THEN
    RETURN v_streak;
  ELSIF v_last_date = v_yesterday THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE community_streaks
  SET current_streak = v_streak,
      longest_streak = GREATEST(longest_streak, v_streak),
      last_active_date = v_today,
      total_active_days = total_active_days + 1,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN v_streak;
END;
$$;

-- ============ RPC: increment/decrement group member count ============
CREATE OR REPLACE FUNCTION public.increment_group_members(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_groups SET member_count = member_count + 1 WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_group_members(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = p_group_id;
END;
$$;

-- ============ RPC: increment/decrement event RSVP count ============
CREATE OR REPLACE FUNCTION public.increment_event_rsvp(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_events SET rsvp_count = rsvp_count + 1 WHERE id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_event_rsvp(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_events SET rsvp_count = GREATEST(rsvp_count - 1, 0) WHERE id = p_event_id;
END;
$$;

-- ============ RPC: increment/decrement comment reactions count ============
CREATE OR REPLACE FUNCTION public.increment_comment_reactions(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_comments SET reactions_count = reactions_count + 1 WHERE id = p_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_comment_reactions(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_comments SET reactions_count = GREATEST(reactions_count - 1, 0) WHERE id = p_comment_id;
END;
$$;
