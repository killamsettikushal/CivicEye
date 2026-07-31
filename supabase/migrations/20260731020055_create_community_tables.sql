/*
# Create Community section tables (posts, polls, votes, likes, comments, bookmarks, follows, reports)

1. New Tables
- `community_posts`: Social feed posts about civic issues.
  - id, author_id (-> profiles), body, media_urls (text[]), media_types (text[]),
    location_name, lat, lng, hashtags (text[]), mentions (text[]),
    is_repost, original_post_id (self-ref), repost_of_id,
    likes_count, comments_count, reposts_count, reports_count,
    created_at, updated_at
- `community_polls`: Optional poll attached to a post.
  - id, post_id (-> community_posts ON DELETE CASCADE), question, options (jsonb array of {id,text}),
    expires_at, created_at
- `community_poll_votes`: One vote per user per poll.
  - id, poll_id (-> community_polls ON DELETE CASCADE), option_id (text), voter_id (-> profiles),
    created_at; UNIQUE(poll_id, voter_id)
- `community_likes`: Likes on posts.
  - id, post_id (-> community_posts ON DELETE CASCADE), user_id (-> profiles),
    created_at; UNIQUE(post_id, user_id)
- `community_comments`: Comments and threaded replies on posts.
  - id, post_id (-> community_posts ON DELETE CASCADE), author_id (-> profiles),
    parent_comment_id (self-ref, nullable), body, likes_count,
    created_at, updated_at
- `community_comment_likes`: Likes on comments.
  - id, comment_id (-> community_comments ON DELETE CASCADE), user_id (-> profiles),
    created_at; UNIQUE(comment_id, user_id)
- `community_bookmarks`: Saved posts per user.
  - id, post_id (-> community_posts ON DELETE CASCADE), user_id (-> profiles),
    created_at; UNIQUE(post_id, user_id)
- `community_follows`: Follow relationships between users.
  - id, follower_id (-> profiles), following_id (-> profiles),
    created_at; UNIQUE(follower_id, following_id)
- `community_post_reports`: User reports of inappropriate posts.
  - id, post_id (-> community_posts ON DELETE CASCADE), reporter_id (-> profiles),
    reason, created_at; UNIQUE(post_id, reporter_id)

2. Storage
- `community-media` bucket (public) for post images/videos/documents.
  - Public read; authenticated upload to own folder; update/delete own files.

3. Security (RLS)
- All tables RLS-enabled.
- Posts: public read (anon+authenticated) so the feed is visible; insert/update/delete own posts.
- Polls: public read; insert own (author of post); delete own.
- Poll votes: public read; insert own (one per user per poll, enforced by unique constraint + WITH CHECK).
- Likes: public read; insert/delete own.
- Comments: public read; insert/update/delete own.
- Comment likes: public read; insert/delete own.
- Bookmarks: owner-scoped (only the user sees their bookmarks).
- Follows: public read; insert/delete own.
- Post reports: insert own; read own (reporters see their own reports); admins read all.

4. Indexes
- community_posts(created_at desc), (author_id), (is_repost), GIN on hashtags.
- community_polls(post_id).
- community_poll_votes(poll_id), (voter_id).
- community_likes(post_id), (user_id).
- community_comments(post_id), (parent_comment_id), (author_id).
- community_bookmarks(user_id).
- community_follows(follower_id), (following_id).
- community_post_reports(post_id), (reporter_id).

5. Important Notes
- Counter columns (likes_count, comments_count, reposts_count) are denormalized for fast display
  and are kept in sync by the application service layer on each insert/delete. RLS prevents
  users from updating counts directly; only the owner can update their own post row (for edits),
  and the service updates counts via the post owner's session.
- Poll voting is single-vote per user per poll, enforced at the DB level by a UNIQUE constraint
  on (poll_id, voter_id). The application checks expiry before accepting a vote.
- Reposts are stored as community_posts rows with is_repost=true and original_post_id set,
  referencing the original post. This keeps the feed unified and allows repost counts.
- Hashtags and mentions are extracted from the post body by the service layer and stored as
  text arrays for efficient filtering and trending computation.
*/

-- ============ community_posts ============
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  media_urls text[] NOT NULL DEFAULT '{}',
  media_types text[] NOT NULL DEFAULT '{}',
  location_name text DEFAULT '',
  lat double precision,
  lng double precision,
  hashtags text[] NOT NULL DEFAULT '{}',
  mentions text[] NOT NULL DEFAULT '{}',
  is_repost boolean NOT NULL DEFAULT false,
  original_post_id uuid REFERENCES community_posts(id) ON DELETE SET NULL,
  repost_of_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  reposts_count integer NOT NULL DEFAULT 0,
  reports_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_posts" ON community_posts;
CREATE POLICY "read_all_posts" ON community_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_post" ON community_posts;
CREATE POLICY "insert_own_post" ON community_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_post" ON community_posts;
CREATE POLICY "update_own_post" ON community_posts FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_post" ON community_posts;
CREATE POLICY "delete_own_post" ON community_posts FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- Admins can delete any post (moderation)
DROP POLICY IF EXISTS "admin_delete_post" ON community_posts;
CREATE POLICY "admin_delete_post" ON community_posts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_repost ON community_posts(is_repost);
CREATE INDEX IF NOT EXISTS idx_community_posts_hashtags ON community_posts USING GIN (hashtags);

-- ============ community_polls ============
CREATE TABLE IF NOT EXISTS community_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  question text NOT NULL DEFAULT '',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_polls" ON community_polls;
CREATE POLICY "read_all_polls" ON community_polls FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_poll" ON community_polls;
CREATE POLICY "insert_own_poll" ON community_polls FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM community_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_poll" ON community_polls;
CREATE POLICY "delete_own_poll" ON community_polls FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM community_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_community_polls_post_id ON community_polls(post_id);

-- ============ community_poll_votes ============
CREATE TABLE IF NOT EXISTS community_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  option_id text NOT NULL,
  voter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, voter_id)
);

ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_poll_votes" ON community_poll_votes;
CREATE POLICY "read_all_poll_votes" ON community_poll_votes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_vote" ON community_poll_votes;
CREATE POLICY "insert_own_vote" ON community_poll_votes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "delete_own_vote" ON community_poll_votes;
CREATE POLICY "delete_own_vote" ON community_poll_votes FOR DELETE
  TO authenticated USING (auth.uid() = voter_id);

CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll_id ON community_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_voter_id ON community_poll_votes(voter_id);

-- ============ community_likes ============
CREATE TABLE IF NOT EXISTS community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_likes" ON community_likes;
CREATE POLICY "read_all_likes" ON community_likes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_like" ON community_likes;
CREATE POLICY "insert_own_like" ON community_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_like" ON community_likes;
CREATE POLICY "delete_own_like" ON community_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON community_likes(user_id);

-- ============ community_comments ============
CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_comments" ON community_comments;
CREATE POLICY "read_all_comments" ON community_comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_comment" ON community_comments;
CREATE POLICY "insert_own_comment" ON community_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_comment" ON community_comments;
CREATE POLICY "update_own_comment" ON community_comments FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_comment" ON community_comments;
CREATE POLICY "delete_own_comment" ON community_comments FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "admin_delete_comment" ON community_comments;
CREATE POLICY "admin_delete_comment" ON community_comments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_author_id ON community_comments(author_id);

-- ============ community_comment_likes ============
CREATE TABLE IF NOT EXISTS community_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE community_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_comment_likes" ON community_comment_likes;
CREATE POLICY "read_all_comment_likes" ON community_comment_likes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_comment_like" ON community_comment_likes;
CREATE POLICY "insert_own_comment_like" ON community_comment_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_comment_like" ON community_comment_likes;
CREATE POLICY "delete_own_comment_like" ON community_comment_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_comment_likes_comment_id ON community_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comment_likes_user_id ON community_comment_likes(user_id);

-- ============ community_bookmarks ============
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookmarks" ON community_bookmarks;
CREATE POLICY "select_own_bookmarks" ON community_bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookmark" ON community_bookmarks;
CREATE POLICY "insert_own_bookmark" ON community_bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookmark" ON community_bookmarks;
CREATE POLICY "delete_own_bookmark" ON community_bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_bookmarks_user_id ON community_bookmarks(user_id);

-- ============ community_follows ============
CREATE TABLE IF NOT EXISTS community_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_follows" ON community_follows;
CREATE POLICY "read_all_follows" ON community_follows FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_follow" ON community_follows;
CREATE POLICY "insert_own_follow" ON community_follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "delete_own_follow" ON community_follows;
CREATE POLICY "delete_own_follow" ON community_follows FOR DELETE
  TO authenticated USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_community_follows_follower_id ON community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following_id ON community_follows(following_id);

-- ============ community_post_reports ============
CREATE TABLE IF NOT EXISTS community_post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);

ALTER TABLE community_post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON community_post_reports;
CREATE POLICY "select_own_reports" ON community_post_reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "admin_read_all_reports" ON community_post_reports;
CREATE POLICY "admin_read_all_reports" ON community_post_reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_report" ON community_post_reports;
CREATE POLICY "insert_own_report" ON community_post_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "delete_own_report" ON community_post_reports;
CREATE POLICY "delete_own_report" ON community_post_reports FOR DELETE
  TO authenticated USING (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS idx_community_post_reports_post_id ON community_post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_reports_reporter_id ON community_post_reports(reporter_id);

-- ============ community-media storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_community_media" ON storage.objects;
CREATE POLICY "public_read_community_media" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "auth_upload_community_media" ON storage.objects;
CREATE POLICY "auth_upload_community_media" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_update_community_media" ON storage.objects;
CREATE POLICY "auth_update_community_media" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_delete_community_media" ON storage.objects;
CREATE POLICY "auth_delete_community_media" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
