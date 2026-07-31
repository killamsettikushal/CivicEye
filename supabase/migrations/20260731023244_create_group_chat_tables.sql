/*
# Group Chat: messages, reactions, read receipts, pinned messages, typing indicators
*/

-- ============ Helper: check group membership ============
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- ============ Helper: check group admin ============
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role = 'admin'
  );
$$;

-- ============ group_chat_messages ============
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  media_url text,
  media_name text,
  voice_duration integer,
  reply_to_id uuid REFERENCES group_chat_messages(id) ON DELETE SET NULL,
  deleted_by_sender boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_group_messages" ON group_chat_messages;
CREATE POLICY "select_group_messages" ON group_chat_messages FOR SELECT
  TO authenticated USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "insert_group_message" ON group_chat_messages;
CREATE POLICY "insert_group_message" ON group_chat_messages FOR INSERT
  TO authenticated WITH CHECK (public.is_group_member(group_id, auth.uid()) AND auth.uid() = sender_id);

DROP POLICY IF EXISTS "update_own_message" ON group_chat_messages;
CREATE POLICY "update_own_message" ON group_chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "delete_own_message" ON group_chat_messages;
CREATE POLICY "delete_own_message" ON group_chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group_created ON group_chat_messages(group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_reply_to ON group_chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_sender ON group_chat_messages(sender_id);

-- ============ group_chat_reactions ============
CREATE TABLE IF NOT EXISTS group_chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES group_chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

ALTER TABLE group_chat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_group_reactions" ON group_chat_reactions;
CREATE POLICY "select_group_reactions" ON group_chat_reactions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM group_chat_messages m
      WHERE m.id = message_id AND public.is_group_member(m.group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_reaction" ON group_chat_reactions;
CREATE POLICY "insert_own_reaction" ON group_chat_reactions FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM group_chat_messages m
      WHERE m.id = message_id AND public.is_group_member(m.group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_own_reaction" ON group_chat_reactions;
CREATE POLICY "update_own_reaction" ON group_chat_reactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reaction" ON group_chat_reactions;
CREATE POLICY "delete_own_reaction" ON group_chat_reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_group_chat_reactions_message ON group_chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_reactions_user ON group_chat_reactions(user_id);

-- ============ group_chat_read_receipts ============
CREATE TABLE IF NOT EXISTS group_chat_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES group_chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

ALTER TABLE group_chat_read_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_group_read_receipts" ON group_chat_read_receipts;
CREATE POLICY "select_group_read_receipts" ON group_chat_read_receipts FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_chat_messages m
      WHERE m.id = message_id AND public.is_group_admin(m.group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_read_receipt" ON group_chat_read_receipts;
CREATE POLICY "insert_own_read_receipt" ON group_chat_read_receipts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_read_receipt" ON group_chat_read_receipts;
CREATE POLICY "update_own_read_receipt" ON group_chat_read_receipts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_group_chat_read_receipts_message ON group_chat_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_read_receipts_user ON group_chat_read_receipts(user_id);

-- ============ group_chat_pinned_messages ============
CREATE TABLE IF NOT EXISTS group_chat_pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES group_chat_messages(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, message_id)
);

ALTER TABLE group_chat_pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_pinned_messages" ON group_chat_pinned_messages;
CREATE POLICY "select_pinned_messages" ON group_chat_pinned_messages FOR SELECT
  TO authenticated USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "admin_insert_pinned" ON group_chat_pinned_messages;
CREATE POLICY "admin_insert_pinned" ON group_chat_pinned_messages FOR INSERT
  TO authenticated WITH CHECK (public.is_group_admin(group_id, auth.uid()));

DROP POLICY IF EXISTS "admin_delete_pinned" ON group_chat_pinned_messages;
CREATE POLICY "admin_delete_pinned" ON group_chat_pinned_messages FOR DELETE
  TO authenticated USING (public.is_group_admin(group_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_group_chat_pinned_group ON group_chat_pinned_messages(group_id);

-- ============ group_chat_typing ============
CREATE TABLE IF NOT EXISTS group_chat_typing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE group_chat_typing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_typing" ON group_chat_typing;
CREATE POLICY "select_typing" ON group_chat_typing FOR SELECT
  TO authenticated USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "insert_own_typing" ON group_chat_typing;
CREATE POLICY "insert_own_typing" ON group_chat_typing FOR INSERT
  TO authenticated WITH CHECK (public.is_group_member(group_id, auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_typing" ON group_chat_typing;
CREATE POLICY "update_own_typing" ON group_chat_typing FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_group_chat_typing_group ON group_chat_typing(group_id);

-- ============ group-chat-media storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-chat-media', 'group-chat-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_group_chat_media" ON storage.objects;
CREATE POLICY "public_read_group_chat_media" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'group-chat-media');

DROP POLICY IF EXISTS "auth_upload_group_chat_media" ON storage.objects;
CREATE POLICY "auth_upload_group_chat_media" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'group-chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_update_group_chat_media" ON storage.objects;
CREATE POLICY "auth_update_group_chat_media" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'group-chat-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'group-chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth_delete_group_chat_media" ON storage.objects;
CREATE POLICY "auth_delete_group_chat_media" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'group-chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============ Enable Realtime on chat tables ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_chat_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_reactions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_chat_typing'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_typing;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_chat_read_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_read_receipts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_chat_pinned_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_pinned_messages;
  END IF;
END $$;

-- ============ RPC: add group member (admin only) ============
CREATE OR REPLACE FUNCTION public.add_group_member(
  p_group_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_admin(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group admins can add members';
  END IF;
  INSERT INTO community_group_members (group_id, user_id, role)
  VALUES (p_group_id, p_user_id, p_role)
  ON CONFLICT (group_id, user_id) DO NOTHING;
  PERFORM public.increment_group_members(p_group_id);
END;
$$;

-- ============ RPC: remove group member (admin or self) ============
CREATE OR REPLACE FUNCTION public.remove_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id AND NOT public.is_group_admin(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group admins can remove other members';
  END IF;
  DELETE FROM community_group_members WHERE group_id = p_group_id AND user_id = p_user_id;
  PERFORM public.decrement_group_members(p_group_id);
END;
$$;

-- ============ RPC: promote to admin ============
CREATE OR REPLACE FUNCTION public.promote_group_admin(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_admin(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group admins can promote members';
  END IF;
  UPDATE community_group_members SET role = 'admin'
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

-- ============ RPC: demote admin ============
CREATE OR REPLACE FUNCTION public.demote_group_admin(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_admin(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group admins can demote members';
  END IF;
  UPDATE community_group_members SET role = 'member'
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

-- ============ RPC: get group members with profiles ============
CREATE OR REPLACE FUNCTION public.get_group_members_with_profiles(p_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  city text,
  level text,
  role text,
  joined_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.user_id, p.full_name, p.username, p.avatar_url, p.city, p.level, m.role, m.joined_at
  FROM community_group_members m
  JOIN profiles p ON p.id = m.user_id
  WHERE m.group_id = p_group_id
  ORDER BY CASE WHEN m.role = 'admin' THEN 0 ELSE 1 END, m.joined_at ASC;
$$;
