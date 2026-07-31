import { supabase } from '@/services/supabaseClient';
import type {
  ChatMessage,
  ChatMessageType,
  ChatReactionType,
  ChatReactionSummary,
  GroupMember,
  UserSearchResult,
  CommunityGroup,
} from '@/types';

interface RawMessageRow {
  id: string;
  group_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  media_url: string | null;
  media_name: string | null;
  voice_duration: number | null;
  reply_to_id: string | null;
  deleted_by_sender: boolean;
  edited_at: string | null;
  created_at: string;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, city, level')
    .in('id', unique);
  if (error) return map;
  (data ?? []).forEach((p: any) => map.set(p.id, p));
  return map;
}

async function fetchReactions(messageIds: string[], userId: string): Promise<Map<string, ChatReactionSummary[]>> {
  const result = new Map<string, ChatReactionSummary[]>();
  if (messageIds.length === 0) return result;
  const { data, error } = await supabase
    .from('group_chat_reactions')
    .select('message_id, type, user_id')
    .in('message_id', messageIds);
  if (error) return result;

  const byMessage = new Map<string, Map<string, string[]>>();
  for (const r of data ?? []) {
    let inner = byMessage.get(r.message_id);
    if (!inner) { inner = new Map(); byMessage.set(r.message_id, inner); }
    const arr = inner.get(r.type) ?? [];
    arr.push(r.user_id);
    inner.set(r.type, arr);
  }

  for (const [msgId, inner] of byMessage) {
    const summaries: ChatReactionSummary[] = [];
    for (const [type, userIds] of inner) {
      summaries.push({ type: type as ChatReactionType, count: userIds.length, userIds });
    }
    result.set(msgId, summaries);
  }
  return result;
}

async function fetchReadReceipts(messageIds: string[], userId: string): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (messageIds.length === 0) return result;
  const { data, error } = await supabase
    .from('group_chat_read_receipts')
    .select('message_id')
    .in('message_id', messageIds);
  if (error) return result;
  for (const r of data ?? []) {
    result.set(r.message_id, (result.get(r.message_id) ?? 0) + 1);
  }
  return result;
}

async function fetchPinnedMessageIds(groupId: string): Promise<Set<string>> {
  const set = new Set<string>();
  const { data, error } = await supabase
    .from('group_chat_pinned_messages')
    .select('message_id')
    .eq('group_id', groupId);
  if (error) return set;
  for (const p of data ?? []) set.add(p.message_id);
  return set;
}

async function buildMessages(rows: RawMessageRow[], userId: string): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];

  const senderIds = rows.map((r) => r.sender_id);
  const messageIds = rows.map((r) => r.id);
  const replyIds = rows.map((r) => r.reply_to_id).filter((id): id is string => id !== null);

  const [profileMap, reactionsMap, readCountMap] = await Promise.all([
    fetchProfiles(senderIds),
    fetchReactions(messageIds, userId),
    fetchReadReceipts(messageIds, userId),
  ]);

  // Fetch reply-to messages
  const replyMessages = new Map<string, ChatMessage>();
  if (replyIds.length > 0) {
    const { data: replyRows, error } = await supabase
      .from('group_chat_messages')
      .select('*')
      .in('id', replyIds);
    if (!error && replyRows) {
      const built = await buildMessages(replyRows as unknown as RawMessageRow[], userId);
      built.forEach((m) => replyMessages.set(m.id, m));
    }
  }

  return rows.map((row) => {
    const profile = profileMap.get(row.sender_id);
    return {
      id: row.id,
      groupId: row.group_id,
      senderId: row.sender_id,
      senderName: profile?.full_name ?? 'Unknown',
      senderUsername: profile?.username ?? 'unknown',
      senderAvatar: profile?.avatar_url ?? null,
      body: row.body,
      messageType: row.message_type as ChatMessageType,
      mediaUrl: row.media_url,
      mediaName: row.media_name,
      voiceDuration: row.voice_duration,
      replyToId: row.reply_to_id,
      replyTo: row.reply_to_id ? (replyMessages.get(row.reply_to_id) ?? null) : null,
      deletedBySender: row.deleted_by_sender,
      editedAt: row.edited_at,
      reactions: reactionsMap.get(row.id) ?? [],
      readByCount: readCountMap.get(row.id) ?? 0,
      isOwn: row.sender_id === userId,
      isPinned: false, // Set by caller
      createdAt: row.created_at,
    };
  });
}

export const groupChatService = {
  // ============ User Search (for adding members) ============

  async searchUsers(query: string, excludeIds: string[] = []): Promise<UserSearchResult[]> {
    if (!query.trim()) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, city, level')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(10);
    if (error) return [];
    return (data ?? [])
      .filter((p: any) => !excludeIds.includes(p.id))
      .map((p: any) => ({
        id: p.id,
        name: p.full_name ?? '',
        username: p.username ?? '',
        avatar: p.avatar_url ?? null,
        city: p.city ?? '',
        level: p.level ?? 'Bronze',
        verified: false,
      }));
  },

  // ============ Messages ============

  async getMessages(groupId: string, userId: string, limit: number = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('group_chat_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const messages = await buildMessages((data ?? []).reverse() as unknown as RawMessageRow[], userId);
    // Mark pinned messages
    const pinnedIds = await fetchPinnedMessageIds(groupId);
    return messages.map((m) => ({ ...m, isPinned: pinnedIds.has(m.id) }));
  },

  async sendMessage(groupId: string, userId: string, input: {
    body?: string;
    messageType?: ChatMessageType;
    mediaUrl?: string | null;
    mediaName?: string | null;
    voiceDuration?: number | null;
    replyToId?: string | null;
  }): Promise<void> {
    const { error } = await supabase
      .from('group_chat_messages')
      .insert({
        group_id: groupId,
        sender_id: userId,
        body: input.body ?? '',
        message_type: input.messageType ?? 'text',
        media_url: input.mediaUrl ?? null,
        media_name: input.mediaName ?? null,
        voice_duration: input.voiceDuration ?? null,
        reply_to_id: input.replyToId ?? null,
      });
    if (error) throw error;
    // Clear typing indicator
    await this.clearTyping(groupId, userId);
  },

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_chat_messages')
      .update({ deleted_by_sender: true })
      .eq('id', messageId)
      .eq('sender_id', userId);
    if (error) throw error;
  },

  async editMessage(messageId: string, userId: string, body: string): Promise<void> {
    const { error } = await supabase
      .from('group_chat_messages')
      .update({ body, edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId);
    if (error) throw error;
  },

  // ============ Media Upload ============

  async uploadMedia(file: File, userId: string): Promise<{ url: string; name: string; type: ChatMessageType }> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const path = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from('group-chat-media')
      .upload(path, file, { contentType: file.type || 'application/octet-stream', cacheControl: '3600' });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('group-chat-media').getPublicUrl(path);

    let type: ChatMessageType = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'voice';

    return { url: urlData.publicUrl, name: file.name, type };
  },

  // ============ Reactions ============

  async toggleReaction(messageId: string, type: ChatReactionType, userId: string): Promise<void> {
    const { data: existing } = await supabase
      .from('group_chat_reactions')
      .select('id, type')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.type === type) {
        await supabase.from('group_chat_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('group_chat_reactions').update({ type }).eq('id', existing.id);
      }
    } else {
      const { error } = await supabase
        .from('group_chat_reactions')
        .insert({ message_id: messageId, user_id: userId, type });
      if (error) throw error;
    }
  },

  // ============ Read Receipts ============

  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    if (messageIds.length === 0) return;
    const inserts = messageIds.map((id) => ({ message_id: id, user_id: userId }));
    const { error } = await supabase
      .from('group_chat_read_receipts')
      .upsert(inserts, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
  },

  // ============ Pinned Messages ============

  async togglePinMessage(groupId: string, messageId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('group_chat_pinned_messages')
      .select('id')
      .eq('group_id', groupId)
      .eq('message_id', messageId)
      .maybeSingle();

    if (existing) {
      await supabase.from('group_chat_pinned_messages').delete().eq('id', existing.id);
      return false;
    }

    const { error } = await supabase
      .from('group_chat_pinned_messages')
      .insert({ group_id: groupId, message_id: messageId, pinned_by: userId });
    if (error) throw error;
    return true;
  },

  async getPinnedMessages(groupId: string, userId: string): Promise<ChatMessage[]> {
    const { data: pinned, error } = await supabase
      .from('group_chat_pinned_messages')
      .select('message_id')
      .eq('group_id', groupId);
    if (error || !pinned || pinned.length === 0) return [];

    const messageIds = pinned.map((p: any) => p.message_id);
    const { data: rows, error: rowsError } = await supabase
      .from('group_chat_messages')
      .select('*')
      .in('id', messageIds)
      .order('created_at', { ascending: true });
    if (rowsError) throw rowsError;

    const messages = await buildMessages((rows ?? []) as unknown as RawMessageRow[], userId);
    return messages.map((m) => ({ ...m, isPinned: true }));
  },

  // ============ Typing Indicators ============

  async setTyping(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_chat_typing')
      .upsert({
        group_id: groupId,
        user_id: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'group_id,user_id' });
    if (error) throw error;
  },

  async clearTyping(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_chat_typing')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) return; // Non-critical
  },

  async getTypingUsers(groupId: string, userId: string): Promise<string[]> {
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data, error } = await supabase
      .from('group_chat_typing')
      .select('user_id')
      .eq('group_id', groupId)
      .gt('updated_at', fiveSecondsAgo)
      .neq('user_id', userId);
    if (error || !data) return [];
    return data.map((d: any) => d.user_id);
  },

  // ============ Group Members ============

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .rpc('get_group_members_with_profiles', { p_group_id: groupId });
    if (error) throw error;
    return (data ?? []).map((m: any) => ({
      userId: m.user_id,
      name: m.full_name ?? 'Unknown',
      username: m.username ?? 'unknown',
      avatar: m.avatar_url ?? null,
      city: m.city ?? '',
      level: m.level ?? 'Bronze',
      role: m.role ?? 'member',
      joinedAt: m.joined_at,
      isOnline: false,
    }));
  },

  async addMember(groupId: string, userId: string, adminId: string): Promise<void> {
    const { error } = await supabase
      .rpc('add_group_member', { p_group_id: groupId, p_user_id: userId, p_role: 'member' });
    if (error) throw error;
  },

  async removeMember(groupId: string, userId: string, requesterId: string): Promise<void> {
    const { error } = await supabase
      .rpc('remove_group_member', { p_group_id: groupId, p_user_id: userId });
    if (error) throw error;
  },

  async promoteAdmin(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .rpc('promote_group_admin', { p_group_id: groupId, p_user_id: userId });
    if (error) throw error;
  },

  async demoteAdmin(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .rpc('demote_group_admin', { p_group_id: groupId, p_user_id: userId });
    if (error) throw error;
  },

  // ============ Group Management ============

  async updateGroup(groupId: string, adminId: string, updates: {
    name?: string;
    description?: string;
    icon?: string;
  }): Promise<void> {
    const patch: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.icon !== undefined) patch.icon = updates.icon;
    const { error } = await supabase
      .from('community_groups')
      .update(patch)
      .eq('id', groupId);
    if (error) throw error;
  },

  async deleteGroup(groupId: string, adminId: string): Promise<void> {
    const { error } = await supabase
      .from('community_groups')
      .delete()
      .eq('id', groupId);
    if (error) throw error;
  },

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .rpc('remove_group_member', { p_group_id: groupId, p_user_id: userId });
    if (error) throw error;
  },

  // ============ Create Group with Members ============

  async createGroupWithMembers(
    userId: string,
    input: {
      name: string;
      description: string;
      category: string;
      city: string;
      icon?: string;
      memberIds: string[];
    },
  ): Promise<CommunityGroup> {
    // Create the group
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
    const { data: groupData, error: groupError } = await supabase
      .from('community_groups')
      .insert({
        name: input.name,
        slug,
        description: input.description,
        category: input.category,
        city: input.city,
        icon: input.icon ?? 'Users',
        created_by: userId,
      })
      .select('*')
      .single();
    if (groupError) throw groupError;

    // Add creator as admin
    await supabase.from('community_group_members').insert({
      group_id: groupData.id,
      user_id: userId,
      role: 'admin',
    });
    await supabase.rpc('increment_group_members', { p_group_id: groupData.id });

    // Add selected members
    for (const memberId of input.memberIds) {
      if (memberId !== userId) {
        await supabase.rpc('add_group_member', {
          p_group_id: groupData.id,
          p_user_id: memberId,
          p_role: 'member',
        });
      }
    }

    return {
      id: groupData.id,
      name: groupData.name,
      slug: groupData.slug,
      description: groupData.description,
      category: groupData.category,
      city: groupData.city,
      icon: groupData.icon,
      coverUrl: groupData.cover_url,
      memberCount: 1 + input.memberIds.filter((id) => id !== userId).length,
      createdBy: userId,
      createdAt: groupData.created_at,
      isMember: true,
    };
  },

  // ============ Real-time Subscriptions ============

  subscribeToMessages(groupId: string, onInsert: (message: ChatMessage) => void, onDelete: (messageId: string) => void, onUpdate: (message: ChatMessage) => void) {
    return supabase
      .channel(`group_chat_messages:${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_chat_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const row = payload.new as any;
        const profileMap = await fetchProfiles([row.sender_id]);
        const profile = profileMap.get(row.sender_id);
        const message: ChatMessage = {
          id: row.id,
          groupId: row.group_id,
          senderId: row.sender_id,
          senderName: profile?.full_name ?? 'Unknown',
          senderUsername: profile?.username ?? 'unknown',
          senderAvatar: profile?.avatar_url ?? null,
          body: row.body,
          messageType: row.message_type,
          mediaUrl: row.media_url,
          mediaName: row.media_name,
          voiceDuration: row.voice_duration,
          replyToId: row.reply_to_id,
          replyTo: null,
          deletedBySender: row.deleted_by_sender,
          editedAt: row.edited_at,
          reactions: [],
          readByCount: 0,
          isOwn: false, // Set by caller
          isPinned: false,
          createdAt: row.created_at,
        };
        onInsert(message);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'group_chat_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        onDelete((payload.old as any).id);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_chat_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const row = payload.new as any;
        const profileMap = await fetchProfiles([row.sender_id]);
        const profile = profileMap.get(row.sender_id);
        const message: ChatMessage = {
          id: row.id,
          groupId: row.group_id,
          senderId: row.sender_id,
          senderName: profile?.full_name ?? 'Unknown',
          senderUsername: profile?.username ?? 'unknown',
          senderAvatar: profile?.avatar_url ?? null,
          body: row.body,
          messageType: row.message_type,
          mediaUrl: row.media_url,
          mediaName: row.media_name,
          voiceDuration: row.voice_duration,
          replyToId: row.reply_to_id,
          replyTo: null,
          deletedBySender: row.deleted_by_sender,
          editedAt: row.edited_at,
          reactions: [],
          readByCount: 0,
          isOwn: false,
          isPinned: false,
          createdAt: row.created_at,
        };
        onUpdate(message);
      })
      .subscribe();
  },

  subscribeToReactions(groupId: string, onChange: (messageId: string) => void) {
    return supabase
      .channel(`group_chat_reactions:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_chat_reactions',
      }, (payload) => {
        const row = (payload.new ?? payload.old) as any;
        if (row?.message_id) onChange(row.message_id);
      })
      .subscribe();
  },

  subscribeToTyping(groupId: string, userId: string, onTypingChange: (userIds: string[]) => void) {
    return supabase
      .channel(`group_chat_typing:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_chat_typing',
        filter: `group_id=eq.${groupId}`,
      }, async () => {
        const users = await this.getTypingUsers(groupId, userId);
        onTypingChange(users);
      })
      .subscribe();
  },

  subscribeToReadReceipts(groupId: string, onChange: (messageId: string) => void) {
    return supabase
      .channel(`group_chat_read_receipts:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_chat_read_receipts',
      }, (payload) => {
        const row = (payload.new ?? payload.old) as any;
        if (row?.message_id) onChange(row.message_id);
      })
      .subscribe();
  },

  subscribeToPinnedMessages(groupId: string, onChange: () => void) {
    return supabase
      .channel(`group_chat_pinned:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_chat_pinned_messages',
        filter: `group_id=eq.${groupId}`,
      }, () => onChange())
      .subscribe();
  },

  // ============ Message Search ============

  async searchMessages(groupId: string, query: string, userId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('group_chat_messages')
      .select('*')
      .eq('group_id', groupId)
      .ilike('body', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return buildMessages((data ?? []) as unknown as RawMessageRow[], userId);
  },
};
