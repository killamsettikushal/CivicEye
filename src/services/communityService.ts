import { supabase } from '@/services/supabaseClient';
import type {
  CommunityPost,
  CommunityComment,
  CommunityPoll,
  CommunityMedia,
  CommunityFeedFilter,
  TrendingTopic,
  PollOption,
  ReactionType,
  ReactionSummary,
  CommunityGroup,
  CommunityEvent,
  RSVPStatus,
  EventCategory,
  CommunityAnnouncement,
  CommunityDraft,
  CommunityAchievement,
  CommunityStreak,
  NotificationPrefs,
  LinkPreview,
  AdvancedSearchFilters,
  WeeklyHighlight,
} from '@/types';

// ============ Helpers ============

function extractHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g) ?? [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g) ?? [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

/** Escapes special PostgREST filter characters in user input. */
function sanitizeFilterValue(input: string): string {
  return input.replace(/[\\%_(),.'"]/g, (ch) => '\\' + ch);
}

function isPollExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

interface RawProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  city: string;
  level: string;
}

interface RawPostRow {
  id: string;
  author_id: string;
  body: string;
  media_urls: string[];
  media_types: string[];
  location_name: string;
  landmark: string;
  lat: number | null;
  lng: number | null;
  hashtags: string[];
  mentions: string[];
  is_repost: boolean;
  original_post_id: string | null;
  repost_of_id: string | null;
  is_pinned: boolean;
  pinned_by: string | null;
  group_id: string | null;
  scheduled_at: string | null;
  link_url: string | null;
  link_title: string | null;
  link_description: string | null;
  link_image: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  reports_count: number;
  created_at: string;
  updated_at: string;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, RawProfile>> {
  const map = new Map<string, RawProfile>();
  if (ids.length === 0) return map;
  const unique = [...new Set(ids)];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, city, level')
    .in('id', unique);
  if (error) return map;
  (data ?? []).forEach((p: any) => map.set(p.id, p));
  return map;
}

async function fetchPolls(postIds: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (postIds.length === 0) return map;
  const { data, error } = await supabase
    .from('community_polls')
    .select('*')
    .in('post_id', postIds);
  if (error) return map;
  (data ?? []).forEach((p: any) => map.set(p.post_id, p));
  return map;
}

async function fetchVoteCounts(pollIds: string[]): Promise<Map<string, Map<string, number>>> {
  const result = new Map<string, Map<string, number>>();
  if (pollIds.length === 0) return result;
  const { data, error } = await supabase
    .from('community_poll_votes')
    .select('poll_id, option_id')
    .in('poll_id', pollIds);
  if (error) return result;
  for (const v of data ?? []) {
    let inner = result.get(v.poll_id);
    if (!inner) {
      inner = new Map();
      result.set(v.poll_id, inner);
    }
    inner.set(v.option_id, (inner.get(v.option_id) ?? 0) + 1);
  }
  return result;
}

async function fetchMyVotes(pollIds: string[], userId: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (pollIds.length === 0) return result;
  const { data, error } = await supabase
    .from('community_poll_votes')
    .select('poll_id, option_id')
    .eq('voter_id', userId)
    .in('poll_id', pollIds);
  if (error) return result;
  for (const v of data ?? []) result.set(v.poll_id, v.option_id);
  return result;
}

async function fetchLikedPostIds(postIds: string[], userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  if (postIds.length === 0) return set;
  const { data, error } = await supabase
    .from('community_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  if (error) return set;
  for (const l of data ?? []) set.add(l.post_id);
  return set;
}

async function fetchBookmarkedPostIds(postIds: string[], userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  if (postIds.length === 0) return set;
  const { data, error } = await supabase
    .from('community_bookmarks')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  if (error) return set;
  for (const b of data ?? []) set.add(b.post_id);
  return set;
}

async function fetchReportedPostIds(postIds: string[], userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  if (postIds.length === 0) return set;
  const { data, error } = await supabase
    .from('community_post_reports')
    .select('post_id')
    .eq('reporter_id', userId)
    .in('post_id', postIds);
  if (error) return set;
  for (const r of data ?? []) set.add(r.post_id);
  return set;
}

async function fetchRepostedPostIds(postIds: string[], userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  if (postIds.length === 0) return set;
  const { data, error } = await supabase
    .from('community_posts')
    .select('original_post_id')
    .eq('author_id', userId)
    .eq('is_repost', true)
    .in('original_post_id', postIds);
  if (error) return set;
  for (const r of data ?? []) {
    if (r.original_post_id) set.add(r.original_post_id);
  }
  return set;
}

async function fetchFollowingIds(userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  const { data, error } = await supabase
    .from('community_follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) return set;
  for (const f of data ?? []) set.add(f.following_id);
  return set;
}

async function fetchBlockedUserIds(userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  const { data, error } = await supabase
    .from('community_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);
  if (error) return set;
  for (const b of data ?? []) set.add(b.blocked_id);
  return set;
}

async function fetchMutedPostIds(postIds: string[], userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  if (postIds.length === 0) return set;
  const { data, error } = await supabase
    .from('community_mutes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  if (error) return set;
  for (const m of data ?? []) set.add(m.post_id);
  return set;
}

async function fetchPostReactions(postIds: string[], userId: string): Promise<Map<string, { summary: ReactionSummary[]; myReaction: ReactionType | null; total: number }>> {
  const result = new Map<string, { summary: ReactionSummary[]; myReaction: ReactionType | null; total: number }>();
  if (postIds.length === 0) return result;
  const { data, error } = await supabase
    .from('community_reactions')
    .select('post_id, type, user_id')
    .in('post_id', postIds);
  if (error) return result;

  const countsByPost = new Map<string, Map<ReactionType, number>>();
  const myReactions = new Map<string, ReactionType>();

  for (const r of data ?? []) {
    const type = r.type as ReactionType;
    let inner = countsByPost.get(r.post_id);
    if (!inner) {
      inner = new Map();
      countsByPost.set(r.post_id, inner);
    }
    inner.set(type, (inner.get(type) ?? 0) + 1);
    if (r.user_id === userId) myReactions.set(r.post_id, type);
  }

  const allTypes: ReactionType[] = ['like', 'love', 'wow', 'celebrate'];
  for (const postId of countsByPost.keys()) {
    const inner = countsByPost.get(postId)!;
    const summary: ReactionSummary[] = allTypes
      .map((type) => ({ type, count: inner.get(type) ?? 0, hasReacted: myReactions.get(postId) === type }))
      .filter((s) => s.count > 0);
    const total = [...inner.values()].reduce((a, b) => a + b, 0);
    result.set(postId, { summary, myReaction: myReactions.get(postId) ?? null, total });
  }
  return result;
}

async function fetchGroupNames(groupIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(groupIds.filter((id): id is string => id !== null))];
  if (unique.length === 0) return map;
  const { data, error } = await supabase
    .from('community_groups')
    .select('id, name')
    .in('id', unique);
  if (error) return map;
  for (const g of data ?? []) map.set(g.id, g.name);
  return map;
}

function mapPoll(
  rawPoll: any,
  voteCounts: Map<string, number>,
  myVote: string | undefined,
): CommunityPoll {
  const rawOptions: any[] = Array.isArray(rawPoll.options) ? rawPoll.options : [];
  const totalVotes = voteCounts.size > 0
    ? [...voteCounts.values()].reduce((a, b) => a + b, 0)
    : 0;
  const options: PollOption[] = rawOptions.map((opt: any) => ({
    id: String(opt.id),
    text: String(opt.text),
    votes: voteCounts.get(String(opt.id)) ?? 0,
  }));
  return {
    id: rawPoll.id,
    postId: rawPoll.post_id,
    question: rawPoll.question,
    options,
    expiresAt: rawPoll.expires_at,
    totalVotes,
    hasVoted: myVote !== undefined,
    votedOptionId: myVote,
    expired: isPollExpired(rawPoll.expires_at),
  };
}

async function buildPosts(
  rows: RawPostRow[],
  userId: string,
): Promise<CommunityPost[]> {
  if (rows.length === 0) return [];

  const authorIds = rows.map((r) => r.author_id);
  const postIds = rows.map((r) => r.id);
  const originalIds = rows
    .map((r) => r.original_post_id)
    .filter((id): id is string => id !== null);

  const [profileMap, pollMap, likedSet, bookmarkedSet, reportedSet, repostedSet, mutedSet, blockedSet, reactionsMap, groupNamesMap] =
    await Promise.all([
      fetchProfiles(authorIds),
      fetchPolls(postIds),
      fetchLikedPostIds(postIds, userId),
      fetchBookmarkedPostIds(postIds, userId),
      fetchReportedPostIds(postIds, userId),
      fetchRepostedPostIds(postIds, userId),
      fetchMutedPostIds(postIds, userId),
      fetchBlockedUserIds(userId),
      fetchPostReactions(postIds, userId),
      fetchGroupNames(rows.map((r) => r.group_id)),
    ]);

  const pollIds = [...pollMap.values()].map((p: any) => p.id);
  const [voteCountsMap, myVotesMap] = await Promise.all([
    fetchVoteCounts(pollIds),
    fetchMyVotes(pollIds, userId),
  ]);

  // Fetch original posts for reposts
  let originalPostsMap = new Map<string, CommunityPost>();
  if (originalIds.length > 0) {
    const { data: origRows, error } = await supabase
      .from('community_posts')
      .select('*')
      .in('id', originalIds);
    if (!error && origRows) {
      originalPostsMap = new Map(
        (await buildPosts(origRows as unknown as RawPostRow[], userId)).map((p) => [p.id, p]),
      );
    }
  }

  return rows.map((row) => {
    const profile = profileMap.get(row.author_id);
    const rawPoll = pollMap.get(row.id);
    const voteCounts = rawPoll ? (voteCountsMap.get(rawPoll.id) ?? new Map()) : new Map();
    const myVote = rawPoll ? myVotesMap.get(rawPoll.id) : undefined;

    const media: CommunityMedia[] = (row.media_urls ?? []).map((url, i) => ({
      url,
      type: (row.media_types?.[i] ?? 'image') as CommunityMedia['type'],
    }));

    const reactionData = reactionsMap.get(row.id);
    const linkPreview: LinkPreview | null =
      row.link_url && (row.link_title || row.link_description || row.link_image)
        ? {
            url: row.link_url,
            title: row.link_title ?? '',
            description: row.link_description ?? '',
            image: row.link_image ?? null,
          }
        : null;

    return {
      id: row.id,
      author: {
        id: row.author_id,
        name: profile?.full_name ?? 'Unknown',
        username: profile?.username ?? 'unknown',
        avatar: profile?.avatar_url ?? null,
        city: profile?.city ?? '',
        level: profile?.level ?? 'Bronze',
        verified: false,
      },
      body: row.body,
      media,
      locationName: row.location_name ?? '',
      landmark: row.landmark ?? '',
      hashtags: row.hashtags ?? [],
      mentions: row.mentions ?? [],
      isRepost: row.is_repost,
      originalPostId: row.original_post_id,
      originalPost: row.original_post_id ? (originalPostsMap.get(row.original_post_id) ?? null) : null,
      poll: rawPoll ? mapPoll(rawPoll, voteCounts, myVote) : null,
      isPinned: row.is_pinned ?? false,
      pinnedBy: row.pinned_by ?? null,
      groupId: row.group_id ?? null,
      groupName: row.group_id ? (groupNamesMap.get(row.group_id) ?? null) : null,
      scheduledAt: row.scheduled_at ?? null,
      linkPreview,
      reactions: reactionData?.summary ?? [],
      totalReactions: reactionData?.total ?? 0,
      myReaction: reactionData?.myReaction ?? null,
      likesCount: row.likes_count,
      commentsCount: row.comments_count,
      repostsCount: row.reposts_count,
      reportsCount: row.reports_count,
      hasLiked: likedSet.has(row.id),
      hasBookmarked: bookmarkedSet.has(row.id),
      hasReposted: repostedSet.has(row.id),
      hasReported: reportedSet.has(row.id),
      hasMuted: mutedSet.has(row.id),
      isBlocked: blockedSet.has(row.author_id),
      isOwn: row.author_id === userId,
      createdAt: row.created_at,
    };
  });
}

// ============ Media upload ============

export const communityService = {
  async uploadMedia(file: File, userId: string): Promise<CommunityMedia> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const path = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from('community-media')
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      });
    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('community-media')
      .getPublicUrl(path);

    let type: CommunityMedia['type'] = 'image';
    if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('application/') || file.type.startsWith('text/')) type = 'document';

    return { url: urlData.publicUrl, type, name: file.name };
  },

  // ============ Feed ============

  async getFeed(
    filter: CommunityFeedFilter,
    userId: string,
    opts?: { search?: string; hashtag?: string; limit?: number; offset?: number; userLat?: number; userLng?: number },
  ): Promise<CommunityPost[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    let query = supabase
      .from('community_posts')
      .select('*')
      .eq('is_repost', false);

    // Exclude scheduled posts that haven't reached their time yet
    query = query.or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString());

    if (opts?.hashtag) {
      query = query.contains('hashtags', [opts.hashtag.toLowerCase()]);
    }
    if (opts?.search) {
      const safeSearch = sanitizeFilterValue(opts.search);
      query = query.or(`body.ilike.%${safeSearch}%,location_name.ilike.%${safeSearch}%`);
    }

    switch (filter) {
      case 'trending':
        query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'following': {
        const following = await fetchFollowingIds(userId);
        if (following.size === 0) return [];
        query = query.in('author_id', [...following]).order('created_at', { ascending: false });
        break;
      }
      case 'polls': {
        const { data: pollPosts, error: pollError } = await supabase
          .from('community_polls')
          .select('post_id');
        if (pollError || !pollPosts) return [];
        const pollPostIds = pollPosts.map((p: any) => p.post_id);
        if (pollPostIds.length === 0) return [];
        query = query.in('id', pollPostIds).order('created_at', { ascending: false });
        break;
      }
      case 'pinned': {
        query = query.eq('is_pinned', true).order('created_at', { ascending: false });
        break;
      }
      case 'scheduled': {
        query = query.not('scheduled_at', 'is', null).gt('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true });
        break;
      }
      case 'nearby': {
        query = query.order('created_at', { ascending: false }).limit(100);
        break;
      }
      case 'latest':
      default:
        query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    let posts = await buildPosts(data as unknown as RawPostRow[], userId);

    if (filter === 'nearby' && opts?.userLat !== undefined && opts?.userLng !== undefined) {
      posts = posts.slice(0, limit);
    }

    return posts;
  },

  async getPostsByAuthor(authorId: string, userId: string): Promise<CommunityPost[]> {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return buildPosts((data ?? []) as unknown as RawPostRow[], userId);
  },

  async getBookmarkedPosts(userId: string): Promise<CommunityPost[]> {
    const { data: bookmarks, error } = await supabase
      .from('community_bookmarks')
      .select('post_id')
      .eq('user_id', userId);
    if (error) throw error;
    const postIds = (bookmarks ?? []).map((b: any) => b.post_id);
    if (postIds.length === 0) return [];
    const { data: rows, error: rowsError } = await supabase
      .from('community_posts')
      .select('*')
      .in('id', postIds)
      .order('created_at', { ascending: false });
    if (rowsError) throw rowsError;
    return buildPosts((rows ?? []) as unknown as RawPostRow[], userId);
  },

  // ============ Create / Edit / Delete ============

  async createPost(
    userId: string,
    input: {
      body: string;
      media: CommunityMedia[];
      locationName?: string;
      landmark?: string;
      lat?: number;
      lng?: number;
      groupId?: string | null;
      scheduledAt?: string | null;
      linkPreview?: LinkPreview | null;
      poll?: {
        question: string;
        options: string[];
        expiresAt: string | null;
      } | null;
    },
  ): Promise<CommunityPost> {
    const hashtags = extractHashtags(input.body);
    const mentions = extractMentions(input.body);

    const insertData: any = {
      author_id: userId,
      body: input.body,
      media_urls: input.media.map((m) => m.url),
      media_types: input.media.map((m) => m.type),
      location_name: input.locationName ?? '',
      landmark: input.landmark ?? '',
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      hashtags,
      mentions,
    };
    if (input.groupId) insertData.group_id = input.groupId;
    if (input.scheduledAt) insertData.scheduled_at = input.scheduledAt;
    if (input.linkPreview) {
      insertData.link_url = input.linkPreview.url;
      insertData.link_title = input.linkPreview.title;
      insertData.link_description = input.linkPreview.description;
      insertData.link_image = input.linkPreview.image;
    }

    const { data: postRow, error: postError } = await supabase
      .from('community_posts')
      .insert(insertData)
      .select('*')
      .single();
    if (postError) throw postError;

    let pollResult: CommunityPoll | null = null;
    if (input.poll && input.poll.options.length >= 2 && input.poll.options.length <= 6) {
      const optionsJson = input.poll.options.map((text, i) => ({
        id: `opt-${i}`,
        text,
      }));
      const { data: pollRow, error: pollError } = await supabase
        .from('community_polls')
        .insert({
          post_id: postRow.id,
          question: input.poll.question || '',
          options: optionsJson,
          expires_at: input.poll.expiresAt,
        })
        .select('*')
        .single();
      if (pollError) throw pollError;
      if (pollRow) {
        pollResult = {
          id: pollRow.id,
          postId: postRow.id,
          question: pollRow.question,
          options: optionsJson.map((o) => ({ ...o, votes: 0 })),
          expiresAt: pollRow.expires_at,
          totalVotes: 0,
          hasVoted: false,
          expired: false,
        };
      }
    }

    const posts = await buildPosts([postRow as unknown as RawPostRow], userId);
    const post = posts[0];
    if (post && pollResult) post.poll = pollResult;

    // Update streak
    await supabase.rpc('update_community_streak', { p_user_id: userId });
    // Check for achievements
    await this.checkAndAwardAchievements(userId);

    return post;
  },

  async updatePost(
    postId: string,
    userId: string,
    updates: { body?: string; locationName?: string; landmark?: string; media?: CommunityMedia[] },
  ): Promise<void> {
    const patch: any = { updated_at: new Date().toISOString() };
    if (updates.body !== undefined) {
      patch.body = updates.body;
      patch.hashtags = extractHashtags(updates.body);
      patch.mentions = extractMentions(updates.body);
    }
    if (updates.locationName !== undefined) patch.location_name = updates.locationName;
    if (updates.landmark !== undefined) patch.landmark = updates.landmark;
    if (updates.media !== undefined) {
      patch.media_urls = updates.media.map((m) => m.url);
      patch.media_types = updates.media.map((m) => m.type);
    }
    const { error } = await supabase
      .from('community_posts')
      .update(patch)
      .eq('id', postId)
      .eq('author_id', userId);
    if (error) throw error;
  },

  async deletePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', userId);
    if (error) throw error;
  },

  // ============ Likes ============

  async toggleLike(postId: string, userId: string): Promise<boolean> {
    // Check existing
    const { data: existing } = await supabase
      .from('community_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_post_likes', { p_post_id: postId });
      return false;
    }

    const { error } = await supabase
      .from('community_likes')
      .insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    await supabase.rpc('increment_post_likes', { p_post_id: postId });
    return true;
  },

  // ============ Bookmarks ============

  async toggleBookmark(postId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('community_bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_bookmarks').delete().eq('id', existing.id);
      return false;
    }

    const { error } = await supabase
      .from('community_bookmarks')
      .insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    return true;
  },

  // ============ Reposts ============

  async toggleRepost(postId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('community_posts')
      .select('id')
      .eq('author_id', userId)
      .eq('is_repost', true)
      .eq('original_post_id', postId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_posts').delete().eq('id', existing.id);
      await supabase.rpc('decrement_post_reposts', { p_post_id: postId });
      return false;
    }

    const { error } = await supabase
      .from('community_posts')
      .insert({
        author_id: userId,
        body: '',
        is_repost: true,
        original_post_id: postId,
      });
    if (error) throw error;
    await supabase.rpc('increment_post_reposts', { p_post_id: postId });
    return true;
  },

  // ============ Reports ============

  async reportPost(postId: string, userId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('community_post_reports')
      .insert({ post_id: postId, reporter_id: userId, reason });
    if (error) throw error;
  },

  // ============ Comments ============

  async getComments(postId: string, userId: string): Promise<CommunityComment[]> {
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const authorIds = [...new Set(data.map((c: any) => c.author_id))];
    const profileMap = await fetchProfiles(authorIds);

    const commentIds = data.map((c: any) => c.id);
    const [likesRes, reactionsRes] = await Promise.all([
      supabase
        .from('community_comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', commentIds),
      supabase
        .from('community_comment_reactions')
        .select('comment_id, type, user_id')
        .in('comment_id', commentIds),
    ]);
    const likedSet = new Set((likesRes.data ?? []).map((l: any) => l.comment_id));

    // Build reaction summaries per comment
    const reactionMap = new Map<string, { summary: ReactionSummary[]; myReaction: ReactionType | null; total: number }>();
    const allTypes: ReactionType[] = ['like', 'love', 'wow', 'celebrate'];
    const countsByComment = new Map<string, Map<ReactionType, number>>();
    const myCommentReactions = new Map<string, ReactionType>();
    for (const r of reactionsRes.data ?? []) {
      const type = r.type as ReactionType;
      let inner = countsByComment.get(r.comment_id);
      if (!inner) {
        inner = new Map();
        countsByComment.set(r.comment_id, inner);
      }
      inner.set(type, (inner.get(type) ?? 0) + 1);
      if (r.user_id === userId) myCommentReactions.set(r.comment_id, type);
    }
    for (const [commentId, inner] of countsByComment) {
      const summary: ReactionSummary[] = allTypes
        .map((type) => ({ type, count: inner.get(type) ?? 0, hasReacted: myCommentReactions.get(commentId) === type }))
        .filter((s) => s.count > 0);
      const total = [...inner.values()].reduce((a, b) => a + b, 0);
      reactionMap.set(commentId, { summary, myReaction: myCommentReactions.get(commentId) ?? null, total });
    }

    const allComments: CommunityComment[] = data.map((c: any) => {
      const profile = profileMap.get(c.author_id);
      const reactionData = reactionMap.get(c.id);
      return {
        id: c.id,
        postId: c.post_id,
        authorId: c.author_id,
        authorName: profile?.full_name ?? 'Unknown',
        authorUsername: profile?.username ?? 'unknown',
        authorAvatar: profile?.avatar_url ?? null,
        body: c.body,
        parentId: c.parent_comment_id,
        likesCount: c.likes_count,
        hasLiked: likedSet.has(c.id),
        reactions: reactionData?.summary ?? [],
        totalReactions: reactionData?.total ?? 0,
        myReaction: reactionData?.myReaction ?? null,
        createdAt: c.created_at,
      };
    });

    // Build threaded structure
    const byId = new Map(allComments.map((c) => [c.id, { ...c, replies: [] as CommunityComment[] }]));
    const roots: CommunityComment[] = [];
    for (const c of allComments) {
      if (c.parentId) {
        const parent = byId.get(c.parentId);
        if (parent) parent.replies!.push(byId.get(c.id)!);
        else roots.push(byId.get(c.id)!);
      } else {
        roots.push(byId.get(c.id)!);
      }
    }
    return roots;
  },

  async addComment(
    postId: string,
    userId: string,
    body: string,
    parentId: string | null = null,
  ): Promise<void> {
    const { error } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        author_id: userId,
        parent_comment_id: parentId,
        body,
      });
    if (error) throw error;
    await supabase.rpc('increment_post_comments', { p_post_id: postId });
    await supabase.rpc('update_community_streak', { p_user_id: userId });
    await this.checkAndAwardAchievements(userId);
  },

  async deleteComment(commentId: string, userId: string, postId: string): Promise<void> {
    const { error } = await supabase
      .from('community_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', userId);
    if (error) throw error;
    await supabase.rpc('decrement_post_comments', { p_post_id: postId });
  },

  // ============ Comment Reactions ============

  async toggleCommentReaction(commentId: string, type: ReactionType, userId: string): Promise<ReactionType | null> {
    const { data: existing } = await supabase
      .from('community_comment_reactions')
      .select('id, type')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.type === type) {
        // Same reaction -> remove
        await supabase.from('community_comment_reactions').delete().eq('id', existing.id);
        await supabase.rpc('decrement_comment_reactions', { p_comment_id: commentId });
        return null;
      }
      // Different reaction -> update
      const { error } = await supabase
        .from('community_comment_reactions')
        .update({ type })
        .eq('id', existing.id);
      if (error) throw error;
      return type;
    }

    const { error } = await supabase
      .from('community_comment_reactions')
      .insert({ comment_id: commentId, user_id: userId, type });
    if (error) throw error;
    await supabase.rpc('increment_comment_reactions', { p_comment_id: commentId });
    return type;
  },

  async toggleCommentLike(commentId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('community_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_comment_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_comment_likes', { p_comment_id: commentId });
      return false;
    }

    const { error } = await supabase
      .from('community_comment_likes')
      .insert({ comment_id: commentId, user_id: userId });
    if (error) throw error;
    await supabase.rpc('increment_comment_likes', { p_comment_id: commentId });
    return true;
  },

  // ============ Polls ============

  async votePoll(pollId: string, optionId: string, userId: string): Promise<void> {
    // Check expiry
    const { data: poll } = await supabase
      .from('community_polls')
      .select('expires_at')
      .eq('id', pollId)
      .maybeSingle();
    if (poll && isPollExpired(poll.expires_at)) {
      throw new Error('This poll has expired.');
    }

    const { error } = await supabase
      .from('community_poll_votes')
      .insert({ poll_id: pollId, option_id: optionId, voter_id: userId });
    if (error) {
      if (error.code === '23505') throw new Error('You have already voted in this poll.');
      throw error;
    }
    await supabase.rpc('update_community_streak', { p_user_id: userId });
    await this.checkAndAwardAchievements(userId);
  },

  async getPollResults(pollId: string, userId: string): Promise<CommunityPoll> {
    const { data: poll, error } = await supabase
      .from('community_polls')
      .select('*')
      .eq('id', pollId)
      .single();
    if (error) throw error;

    const voteCounts = (await fetchVoteCounts([pollId])).get(pollId) ?? new Map();
    const myVote = (await fetchMyVotes([pollId], userId)).get(pollId);
    return mapPoll(poll, voteCounts, myVote);
  },

  // ============ Follows ============

  async toggleFollow(followingId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('community_follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_follows').delete().eq('id', existing.id);
      return false;
    }

    const { error } = await supabase
      .from('community_follows')
      .insert({ follower_id: userId, following_id: followingId });
    if (error) throw error;
    return true;
  },

  async isFollowing(followingId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('community_follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', followingId)
      .maybeSingle();
    return !!data;
  },

  async getFollowerCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('community_follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);
    if (error) return 0;
    return count ?? 0;
  },

  async getFollowingCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('community_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);
    if (error) return 0;
    return count ?? 0;
  },

  // ============ Trending ============

  async getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
    // Fetch recent posts and aggregate hashtags
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('community_posts')
      .select('hashtags')
      .gte('created_at', since);
    if (error) return [];
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      for (const tag of (row as any).hashtags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  // ============ User search ============

  async searchUsers(query: string): Promise<Array<{
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    city: string;
  }>> {
    if (!query.trim()) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, city')
      .or(`full_name.ilike.%${sanitizeFilterValue(query)}%,username.ilike.%${sanitizeFilterValue(query)}%`)
      .limit(10);
    if (error) return [];
    return (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.full_name ?? '',
      username: p.username ?? '',
      avatar: p.avatar_url ?? null,
      city: p.city ?? '',
    }));
  },

  // ============ Post Reactions ============

  async togglePostReaction(postId: string, type: ReactionType, userId: string): Promise<ReactionType | null> {
    const { data: existing } = await supabase
      .from('community_reactions')
      .select('id, type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.type === type) {
        await supabase.from('community_reactions').delete().eq('id', existing.id);
        return null;
      }
      const { error } = await supabase
        .from('community_reactions')
        .update({ type })
        .eq('id', existing.id);
      if (error) throw error;
      return type;
    }

    const { error } = await supabase
      .from('community_reactions')
      .insert({ post_id: postId, user_id: userId, type });
    if (error) throw error;
    return type;
  },

  // ============ Pin Posts (admin) ============

  async togglePinPost(postId: string, adminId: string): Promise<boolean> {
    const { data: post } = await supabase
      .from('community_posts')
      .select('is_pinned')
      .eq('id', postId)
      .maybeSingle();
    if (!post) throw new Error('Post not found');

    const newPinned = !post.is_pinned;
    const { error } = await supabase
      .from('community_posts')
      .update({ is_pinned: newPinned, pinned_by: newPinned ? adminId : null })
      .eq('id', postId);
    if (error) throw error;
    return newPinned;
  },

  // ============ Mute Conversation ============

  async toggleMutePost(postId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('community_mutes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_mutes').delete().eq('id', existing.id);
      return false;
    }

    const { error } = await supabase
      .from('community_mutes')
      .insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    return true;
  },

  // ============ Block User ============

  async toggleBlockUser(blockedId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('community_blocks')
      .select('id')
      .eq('blocker_id', userId)
      .eq('blocked_id', blockedId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_blocks').delete().eq('id', existing.id);
      return false;
    }

    const { error } = await supabase
      .from('community_blocks')
      .insert({ blocker_id: userId, blocked_id: blockedId });
    if (error) throw error;
    return true;
  },

  async getBlockedUserIds(userId: string): Promise<Set<string>> {
    return fetchBlockedUserIds(userId);
  },

  // ============ Link Preview ============

  async fetchLinkPreview(url: string): Promise<LinkPreview | null> {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) return null;
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
        ?? html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      return {
        url,
        title: titleMatch?.[1]?.trim() ?? '',
        description: descMatch?.[1]?.trim() ?? '',
        image: imgMatch?.[1]?.trim() ?? null,
      };
    } catch {
      return null;
    }
  },

  // ============ Drafts ============

  async getDrafts(userId: string): Promise<CommunityDraft[]> {
    const { data, error } = await supabase
      .from('community_drafts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d: any) => ({
      id: d.id,
      body: d.body ?? '',
      media: (d.media_urls ?? []).map((url: string, i: number) => ({
        url,
        type: (d.media_types?.[i] ?? 'image') as CommunityMedia['type'],
      })),
      locationName: d.location_name ?? '',
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      pollData: d.poll_data ?? null,
      groupId: d.group_id ?? null,
      scheduledAt: d.scheduled_at ?? null,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  },

  async saveDraft(userId: string, draft: {
    body: string;
    media: CommunityMedia[];
    locationName?: string;
    lat?: number;
    lng?: number;
    pollData?: any;
    groupId?: string | null;
    scheduledAt?: string | null;
  }): Promise<CommunityDraft> {
    const { data, error } = await supabase
      .from('community_drafts')
      .insert({
        user_id: userId,
        body: draft.body,
        media_urls: draft.media.map((m) => m.url),
        media_types: draft.media.map((m) => m.type),
        location_name: draft.locationName ?? '',
        lat: draft.lat ?? null,
        lng: draft.lng ?? null,
        poll_data: draft.pollData ?? null,
        group_id: draft.groupId ?? null,
        scheduled_at: draft.scheduledAt ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      body: data.body,
      media: (data.media_urls ?? []).map((url: string, i: number) => ({
        url,
        type: (data.media_types?.[i] ?? 'image') as CommunityMedia['type'],
      })),
      locationName: data.location_name ?? '',
      lat: data.lat,
      lng: data.lng,
      pollData: data.poll_data,
      groupId: data.group_id,
      scheduledAt: data.scheduled_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deleteDraft(draftId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('community_drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  // ============ Groups ============

  async getGroups(userId: string, category?: string): Promise<CommunityGroup[]> {
    let query = supabase.from('community_groups').select('*');
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    query = query.order('member_count', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;

    const groupIds = (data ?? []).map((g: any) => g.id);
    const { data: memberships } = await supabase
      .from('community_group_members')
      .select('group_id')
      .eq('user_id', userId)
      .in('group_id', groupIds);
    const memberSet = new Set((memberships ?? []).map((m: any) => m.group_id));

    return (data ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description ?? '',
      category: g.category,
      city: g.city ?? '',
      icon: g.icon ?? 'Users',
      coverUrl: g.cover_url ?? null,
      memberCount: g.member_count ?? 0,
      createdBy: g.created_by,
      createdAt: g.created_at,
      isMember: memberSet.has(g.id),
    }));
  },

  async createGroup(userId: string, input: {
    name: string;
    description: string;
    category: string;
    city: string;
    icon?: string;
  }): Promise<CommunityGroup> {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase
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
    if (error) throw error;

    // Auto-join as owner
    await supabase.from('community_group_members').insert({
      group_id: data.id,
      user_id: userId,
      role: 'admin',
    });
    await supabase.rpc('increment_group_members', { p_group_id: data.id });

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      category: data.category,
      city: data.city,
      icon: data.icon,
      coverUrl: data.cover_url,
      memberCount: 1,
      createdBy: userId,
      createdAt: data.created_at,
      isMember: true,
    };
  },

  async toggleGroupMembership(groupId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('community_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_group_members').delete().eq('id', existing.id);
      await supabase.rpc('decrement_group_members', { p_group_id: groupId });
      return false;
    }

    const { error } = await supabase
      .from('community_group_members')
      .insert({ group_id: groupId, user_id: userId });
    if (error) throw error;
    await supabase.rpc('increment_group_members', { p_group_id: groupId });
    return true;
  },

  async getGroupPosts(groupId: string, userId: string): Promise<CommunityPost[]> {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_repost', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return buildPosts((data ?? []) as unknown as RawPostRow[], userId);
  },

  // ============ Events ============

  async getEvents(userId: string, filter?: 'upcoming' | 'past' | 'all'): Promise<CommunityEvent[]> {
    let query = supabase.from('community_events').select('*');
    const now = new Date().toISOString();
    if (filter === 'upcoming') {
      query = query.gte('starts_at', now);
    } else if (filter === 'past') {
      query = query.lt('starts_at', now);
    }
    query = query.order('starts_at', { ascending: filter === 'past' ? false : true });
    const { data, error } = await query;
    if (error) throw error;

    const eventIds = (data ?? []).map((e: any) => e.id);
    const { data: rsvps } = await supabase
      .from('community_event_rsvps')
      .select('event_id, status')
      .eq('user_id', userId)
      .in('event_id', eventIds);
    const rsvpMap = new Map((rsvps ?? []).map((r: any) => [r.event_id, r.status as RSVPStatus]));

    const organizerIds = [...new Set((data ?? []).map((e: any) => e.organizer_id))];
    const profileMap = await fetchProfiles(organizerIds);

    return (data ?? []).map((e: any) => {
      const profile = profileMap.get(e.organizer_id);
      return {
        id: e.id,
        title: e.title,
        description: e.description ?? '',
        category: e.category as EventCategory,
        groupId: e.group_id,
        organizerId: e.organizer_id,
        organizerName: profile?.full_name ?? 'Unknown',
        locationName: e.location_name ?? '',
        lat: e.lat,
        lng: e.lng,
        city: e.city ?? '',
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        bannerUrl: e.banner_url,
        maxAttendees: e.max_attendees ?? -1,
        rsvpCount: e.rsvp_count ?? 0,
        myRSVP: rsvpMap.get(e.id) ?? null,
        createdAt: e.created_at,
      };
    });
  },

  async createEvent(userId: string, input: {
    title: string;
    description: string;
    category: EventCategory;
    groupId?: string | null;
    locationName: string;
    lat?: number;
    lng?: number;
    city?: string;
    startsAt: string;
    endsAt?: string | null;
    maxAttendees?: number;
  }): Promise<CommunityEvent> {
    const { data, error } = await supabase
      .from('community_events')
      .insert({
        title: input.title,
        description: input.description,
        category: input.category,
        group_id: input.groupId ?? null,
        organizer_id: userId,
        location_name: input.locationName,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        city: input.city ?? '',
        starts_at: input.startsAt,
        ends_at: input.endsAt ?? null,
        max_attendees: input.maxAttendees ?? -1,
      })
      .select('*')
      .single();
    if (error) throw error;
    await this.checkAndAwardAchievements(userId);
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      groupId: data.group_id,
      organizerId: data.organizer_id,
      organizerName: '',
      locationName: data.location_name,
      lat: data.lat,
      lng: data.lng,
      city: data.city,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      bannerUrl: data.banner_url,
      maxAttendees: data.max_attendees,
      rsvpCount: 0,
      myRSVP: null,
      createdAt: data.created_at,
    };
  },

  async toggleRSVP(eventId: string, status: RSVPStatus, userId: string): Promise<RSVPStatus | null> {
    const { data: existing } = await supabase
      .from('community_event_rsvps')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.status === status) {
        // Toggle off
        await supabase.from('community_event_rsvps').delete().eq('id', existing.id);
        await supabase.rpc('decrement_event_rsvp', { p_event_id: eventId });
        return null;
      }
      // Update status (no count change)
      const { error } = await supabase
        .from('community_event_rsvps')
        .update({ status })
        .eq('id', existing.id);
      if (error) throw error;
      return status;
    }

    const { error } = await supabase
      .from('community_event_rsvps')
      .insert({ event_id: eventId, user_id: userId, status });
    if (error) throw error;
    await supabase.rpc('increment_event_rsvp', { p_event_id: eventId });
    return status;
  },

  // ============ Announcements ============

  async getAnnouncements(): Promise<CommunityAnnouncement[]> {
    const { data, error } = await supabase
      .from('community_announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;

    const authorIds = [...new Set((data ?? []).map((a: any) => a.author_id))];
    const profileMap = await fetchProfiles(authorIds);

    return (data ?? []).map((a: any) => {
      const profile = profileMap.get(a.author_id);
      return {
        id: a.id,
        title: a.title,
        body: a.body,
        authorId: a.author_id,
        authorName: profile?.full_name ?? 'Admin',
        pinned: a.pinned,
        groupId: a.group_id,
        expiresAt: a.expires_at,
        createdAt: a.created_at,
      };
    });
  },

  async createAnnouncement(adminId: string, input: {
    title: string;
    body: string;
    pinned?: boolean;
    groupId?: string | null;
    expiresAt?: string | null;
  }): Promise<CommunityAnnouncement> {
    const { data, error } = await supabase
      .from('community_announcements')
      .insert({
        title: input.title,
        body: input.body,
        author_id: adminId,
        pinned: input.pinned ?? true,
        group_id: input.groupId ?? null,
        expires_at: input.expiresAt ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      title: data.title,
      body: data.body,
      authorId: data.author_id,
      authorName: '',
      pinned: data.pinned,
      groupId: data.group_id,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  },

  async deleteAnnouncement(announcementId: string): Promise<void> {
    const { error } = await supabase
      .from('community_announcements')
      .delete()
      .eq('id', announcementId);
    if (error) throw error;
  },

  // ============ Achievements ============

  async getAchievements(userId: string): Promise<CommunityAchievement[]> {
    const [achRes, earnedRes] = await Promise.all([
      supabase.from('community_achievements').select('*').order('threshold', { ascending: true }),
      supabase.from('community_user_achievements').select('achievement_id, earned_at').eq('user_id', userId),
    ]);
    if (achRes.error) throw achRes.error;
    const earnedMap = new Map((earnedRes.data ?? []).map((e: any) => [e.achievement_id, e.earned_at]));
    return (achRes.data ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      title: a.title,
      description: a.description,
      icon: a.icon,
      category: a.category,
      threshold: a.threshold,
      points: a.points,
      earned: earnedMap.has(a.id),
      earnedAt: earnedMap.get(a.id) ?? null,
    }));
  },

  async checkAndAwardAchievements(userId: string): Promise<void> {
    try {
      // Count user activity
      // Fetch user's post IDs first for the polls sub-query
      const { data: userPostRows } = await supabase
        .from('community_posts')
        .select('id')
        .eq('author_id', userId)
        .eq('is_repost', false);
      const userPostIds = (userPostRows ?? []).map((p: any) => p.id);

      const [postsCount, commentsCount, pollsCount, eventsCount, groupsCount, likesReceived] = await Promise.all([
        supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('is_repost', false),
        supabase.from('community_comments').select('id', { count: 'exact', head: true }).eq('author_id', userId),
        userPostIds.length > 0
          ? supabase.from('community_polls').select('id', { count: 'exact', head: true }).in('post_id', userPostIds)
          : Promise.resolve({ count: 0, data: null, error: null }),
        supabase.from('community_events').select('id', { count: 'exact', head: true }).eq('organizer_id', userId),
        supabase.from('community_groups').select('id', { count: 'exact', head: true }).eq('created_by', userId),
        supabase.from('community_likes').select('id', { count: 'exact', head: true }),
      ]);

      const counts: Record<string, number> = {
        first_post: postsCount.count ?? 0,
        ten_posts: postsCount.count ?? 0,
        fifty_posts: postsCount.count ?? 0,
        first_comment: commentsCount.count ?? 0,
        ten_comments: commentsCount.count ?? 0,
        first_poll: pollsCount.count ?? 0,
        first_event: eventsCount.count ?? 0,
        first_group: groupsCount.count ?? 0,
        first_like: likesReceived.count ?? 0,
        ten_likes: likesReceived.count ?? 0,
        fifty_likes: likesReceived.count ?? 0,
      };

      const achievements = await this.getAchievements(userId);
      const toAward = achievements.filter((a) => {
        if (a.earned) return false;
        const count = counts[a.name];
        if (count === undefined) return false;
        return count >= a.threshold;
      });

      if (toAward.length > 0) {
        const inserts = toAward.map((a) => ({ user_id: userId, achievement_id: a.id }));
        await supabase.from('community_user_achievements').insert(inserts);
      }

      // Check streak achievements
      const { data: streak } = await supabase
        .from('community_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .maybeSingle();
      const streakCount = streak?.current_streak ?? 0;
      const streakAchievements = achievements.filter((a) =>
        (a.name === 'streak_7' || a.name === 'streak_30') && !a.earned,
      );
      for (const a of streakAchievements) {
        if (streakCount >= a.threshold) {
          await supabase.from('community_user_achievements').insert({
            user_id: userId,
            achievement_id: a.id,
          });
        }
      }
    } catch (err) {
      // Silently fail — achievements are non-critical
      console.error('[communityService] Achievement check failed:', err);
    }
  },

  // ============ Streaks ============

  async getStreak(userId: string): Promise<CommunityStreak> {
    const { data, error } = await supabase
      .from('community_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', totalActiveDays: 0 };
    }
    return {
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      lastActiveDate: data.last_active_date,
      totalActiveDays: data.total_active_days,
    };
  },

  // ============ Notification Preferences ============

  async getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
    const { data, error } = await supabase
      .from('community_notification_prefs')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      return {
        notifyLikes: true, notifyComments: true, notifyMentions: true,
        notifyFollows: true, notifyPollResults: true, notifyAnnouncements: true,
        notifyEvents: true, notifyGroupUpdates: true, emailDigest: false,
      };
    }
    return {
      notifyLikes: data.notify_likes,
      notifyComments: data.notify_comments,
      notifyMentions: data.notify_mentions,
      notifyFollows: data.notify_follows,
      notifyPollResults: data.notify_poll_results,
      notifyAnnouncements: data.notify_announcements,
      notifyEvents: data.notify_events,
      notifyGroupUpdates: data.notify_group_updates,
      emailDigest: data.email_digest,
    };
  },

  async updateNotificationPrefs(userId: string, prefs: Partial<NotificationPrefs>): Promise<void> {
    const update: any = { updated_at: new Date().toISOString() };
    if (prefs.notifyLikes !== undefined) update.notify_likes = prefs.notifyLikes;
    if (prefs.notifyComments !== undefined) update.notify_comments = prefs.notifyComments;
    if (prefs.notifyMentions !== undefined) update.notify_mentions = prefs.notifyMentions;
    if (prefs.notifyFollows !== undefined) update.notify_follows = prefs.notifyFollows;
    if (prefs.notifyPollResults !== undefined) update.notify_poll_results = prefs.notifyPollResults;
    if (prefs.notifyAnnouncements !== undefined) update.notify_announcements = prefs.notifyAnnouncements;
    if (prefs.notifyEvents !== undefined) update.notify_events = prefs.notifyEvents;
    if (prefs.notifyGroupUpdates !== undefined) update.notify_group_updates = prefs.notifyGroupUpdates;
    if (prefs.emailDigest !== undefined) update.email_digest = prefs.emailDigest;

    const { data: existing } = await supabase
      .from('community_notification_prefs')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('community_notification_prefs')
        .update(update)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('community_notification_prefs')
        .insert({ user_id: userId, ...update });
      if (error) throw error;
    }
  },

  // ============ Advanced Search ============

  async advancedSearch(filters: AdvancedSearchFilters, userId: string): Promise<CommunityPost[]> {
    let query = supabase
      .from('community_posts')
      .select('*')
      .eq('is_repost', false)
      .or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString());

    if (filters.query) {
      const safeQuery = sanitizeFilterValue(filters.query);
      query = query.or(`body.ilike.%${safeQuery}%,location_name.ilike.%${safeQuery}%`);
    }
    if (filters.location) {
      query = query.ilike('location_name', `%${sanitizeFilterValue(filters.location)}%`);
    }
    if (filters.hashtag) {
      query = query.contains('hashtags', [filters.hashtag.toLowerCase()]);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters.hasPoll) {
      const { data: pollPosts } = await supabase.from('community_polls').select('post_id');
      const pollPostIds = (pollPosts ?? []).map((p: any) => p.post_id);
      if (pollPostIds.length === 0) return [];
      query = query.in('id', pollPostIds);
    }

    query = query.order('created_at', { ascending: false }).limit(50);
    const { data, error } = await query;
    if (error) throw error;

    let posts = await buildPosts((data ?? []) as unknown as RawPostRow[], userId);

    // Filter by media type client-side (requires post.media inspection)
    if (filters.mediaType && filters.mediaType !== 'any') {
      posts = posts.filter((p) => p.media.some((m) => m.type === filters.mediaType));
    }

    return posts;
  },

  // ============ Weekly Highlights ============

  async getWeeklyHighlights(userId: string): Promise<WeeklyHighlight[]> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const highlights: WeeklyHighlight[] = [];

    // Top post (most liked this week)
    const { data: topPosts } = await supabase
      .from('community_posts')
      .select('id, body, likes_count, author_id')
      .eq('is_repost', false)
      .gte('created_at', since)
      .order('likes_count', { ascending: false })
      .limit(1);
    if (topPosts && topPosts.length > 0) {
      const p = topPosts[0];
      const profileMap = await fetchProfiles([p.author_id]);
      const profile = profileMap.get(p.author_id);
      highlights.push({
        type: 'top-post',
        title: 'Top Post of the Week',
        subtitle: `"${p.body.slice(0, 60)}${p.body.length > 60 ? '...' : ''}" by ${profile?.full_name ?? 'Unknown'}`,
        data: { postId: p.id, likes: p.likes_count },
      });
    }

    // Top contributor (most posts this week)
    const { data: contributorPosts } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('is_repost', false)
      .gte('created_at', since);
    if (contributorPosts && contributorPosts.length > 0) {
      const counts = new Map<string, number>();
      for (const p of contributorPosts) {
        counts.set(p.author_id, (counts.get(p.author_id) ?? 0) + 1);
      }
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const profileMap = await fetchProfiles([top[0]]);
      const profile = profileMap.get(top[0]);
      highlights.push({
        type: 'top-contributor',
        title: 'Top Contributor',
        subtitle: `${profile?.full_name ?? 'Unknown'} posted ${top[1]} times this week`,
        data: { userId: top[0], postCount: top[1] },
      });
    }

    // Trending tag
    const trending = await this.getTrendingTopics(1);
    if (trending.length > 0) {
      highlights.push({
        type: 'trending-tag',
        title: 'Trending This Week',
        subtitle: `#${trending[0].tag} with ${trending[0].count} posts`,
        data: { tag: trending[0].tag },
      });
    }

    // Streak leader
    const { data: streakLeader } = await supabase
      .from('community_streaks')
      .select('user_id, current_streak')
      .order('current_streak', { ascending: false })
      .limit(1);
    if (streakLeader && streakLeader.length > 0) {
      const profileMap = await fetchProfiles([streakLeader[0].user_id]);
      const profile = profileMap.get(streakLeader[0].user_id);
      highlights.push({
        type: 'streak-leader',
        title: 'Streak Leader',
        subtitle: `${profile?.full_name ?? 'Unknown'} has a ${streakLeader[0].current_streak}-day streak`,
        data: { userId: streakLeader[0].user_id, streak: streakLeader[0].current_streak },
      });
    }

    return highlights;
  },

  // ============ Contributor Leaderboard ============

  async getContributorLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    name: string;
    username: string;
    avatar: string | null;
    postCount: number;
    streak: number;
    level: string;
  }>> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('is_repost', false)
      .gte('created_at', since);
    if (error) return [];

    const counts = new Map<string, number>();
    for (const p of posts ?? []) {
      counts.set(p.author_id, (counts.get(p.author_id) ?? 0) + 1);
    }
    const topUsers = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (topUsers.length === 0) return [];

    const userIds = topUsers.map(([id]) => id);
    const [profileMap, streakRes] = await Promise.all([
      fetchProfiles(userIds),
      supabase.from('community_streaks').select('user_id, current_streak').in('user_id', userIds),
    ]);
    const streakMap = new Map((streakRes.data ?? []).map((s: any) => [s.user_id, s.current_streak]));

    return topUsers.map(([userId, postCount]) => {
      const profile = profileMap.get(userId);
      return {
        userId,
        name: profile?.full_name ?? 'Unknown',
        username: profile?.username ?? 'unknown',
        avatar: profile?.avatar_url ?? null,
        postCount,
        streak: streakMap.get(userId) ?? 0,
        level: profile?.level ?? 'Bronze',
      };
    });
  },
};
