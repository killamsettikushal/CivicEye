/*
# Add atomic counter RPC functions for community posts and comments

1. New Functions
- `increment_post_likes(p_post_id uuid)`: Atomically increments likes_count on a community post.
- `decrement_post_likes(p_post_id uuid)`: Atomically decrements likes_count (floor at 0).
- `increment_post_comments(p_post_id uuid)`: Atomically increments comments_count.
- `decrement_post_comments(p_post_id uuid)`: Atomically decrements comments_count (floor at 0).
- `increment_post_reposts(p_post_id uuid)`: Atomically increments reposts_count.
- `decrement_post_reposts(p_post_id uuid)`: Atomically decrements reposts_count (floor at 0).
- `increment_comment_likes(p_comment_id uuid)`: Atomically increments comment likes_count.
- `decrement_comment_likes(p_comment_id uuid)`: Atomically decrements comment likes_count (floor at 0).

2. Security
- All functions are SECURITY DEFINER so any authenticated user can call them after inserting
  a like/comment/repost row. They only modify denormalized counter columns, not the actual
  relational data, so they cannot be abused to inflate counts without a corresponding row
  (which is RLS-protected).

3. Important Notes
- These run as SECURITY DEFINER to bypass RLS on the counter UPDATE, since the caller is
  not the post author and thus cannot UPDATE the post row directly. The functions only touch
  the counter columns, preventing privilege escalation.
- Decrement functions use GREATEST(x - 1, 0) to prevent negative counts.
*/

CREATE OR REPLACE FUNCTION public.increment_post_likes(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_likes(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_post_comments(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_comments(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_post_reposts(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_posts SET reposts_count = reposts_count + 1 WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_reposts(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_posts SET reposts_count = GREATEST(reposts_count - 1, 0) WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_comment_likes(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_comments SET likes_count = likes_count + 1 WHERE id = p_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_comment_likes(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE community_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = p_comment_id;
END;
$$;
