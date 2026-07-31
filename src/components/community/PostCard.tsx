import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, Repeat2, Bookmark, Share2, MoreHorizontal,
  MapPin, Pencil, Trash2, Flag, Link2, Send, Pin, BellOff, Ban, ExternalLink,
} from 'lucide-react';
import type { CommunityPost, ReactionType } from '@/types';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { timeAgo, getInitials } from '@/utils/helpers';
import { MediaGallery } from './MediaGallery';
import { PollCard } from './PollCard';
import { ReactionBar } from './ReactionBar';
import { CommentThread } from './CommentThread';
import { Modal } from '@/components/ui/Modal';

interface PostCardProps {
  post: CommunityPost;
  onUpdate: (post: CommunityPost) => void;
  onDelete: (postId: string) => void;
}

export function PostCard({ post, onUpdate, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editLocation, setEditLocation] = useState(post.locationName);
  const [editLandmark, setEditLandmark] = useState(post.landmark);
  const [reportReason, setReportReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const displayPost = post.isRepost && post.originalPost ? post.originalPost : post;

  const handleLike = async () => {
    try {
      const liked = await communityService.toggleLike(post.id, user.id);
      onUpdate({ ...post, hasLiked: liked, likesCount: post.likesCount + (liked ? 1 : -1) });
    } catch { showToast('Failed to like post', 'error'); }
  };

  const handleBookmark = async () => {
    try {
      const bookmarked = await communityService.toggleBookmark(post.id, user.id);
      onUpdate({ ...post, hasBookmarked: bookmarked });
      showToast(bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks', 'success');
    } catch { showToast('Failed to bookmark', 'error'); }
  };

  const handleRepost = async () => {
    try {
      const reposted = await communityService.toggleRepost(post.id, user.id);
      onUpdate({ ...post, hasReposted: reposted, repostsCount: post.repostsCount + (reposted ? 1 : -1) });
      showToast(reposted ? 'Reposted' : 'Repost removed', 'success');
    } catch { showToast('Failed to repost', 'error'); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { showToast('Link: ' + url, 'info'); }
  };

  const handleReactionChange = (type: ReactionType | null) => {
    // Re-fetch reactions summary is complex; for now just update myReaction
    onUpdate({ ...post, myReaction: type });
  };

  const handleReport = async () => {
    if (!reportReason.trim()) { showToast('Please enter a reason', 'warning'); return; }
    setSaving(true);
    try {
      await communityService.reportPost(post.id, user.id, reportReason.trim());
      onUpdate({ ...post, hasReported: true });
      setReportOpen(false); setReportReason('');
      showToast('Post reported. Our team will review it.', 'success');
    } catch { showToast('Failed to report post', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editBody.trim()) { showToast('Post cannot be empty', 'warning'); return; }
    setSaving(true);
    try {
      await communityService.updatePost(post.id, user.id, { body: editBody, locationName: editLocation, landmark: editLandmark });
      onUpdate({
        ...post,
        body: editBody, locationName: editLocation, landmark: editLandmark,
        hashtags: (editBody.match(/#(\w+)/g) ?? []).map((m) => m.slice(1).toLowerCase()),
        mentions: (editBody.match(/@(\w+)/g) ?? []).map((m) => m.slice(1).toLowerCase()),
      });
      setEditOpen(false);
      showToast('Post updated', 'success');
    } catch { showToast('Failed to update post', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await communityService.deletePost(post.id, user.id);
      onDelete(post.id);
      showToast('Post deleted', 'success');
    } catch { showToast('Failed to delete post', 'error'); }
  };

  const handlePin = async () => {
    try {
      const pinned = await communityService.togglePinPost(post.id, user.id);
      onUpdate({ ...post, isPinned: pinned });
      showToast(pinned ? 'Post pinned' : 'Post unpinned', 'success');
      setMenuOpen(false);
    } catch { showToast('Failed to pin post', 'error'); }
  };

  const handleMute = async () => {
    try {
      const muted = await communityService.toggleMutePost(post.id, user.id);
      onUpdate({ ...post, hasMuted: muted });
      showToast(muted ? 'Conversation muted' : 'Conversation unmuted', 'success');
      setMenuOpen(false);
    } catch { showToast('Failed to mute', 'error'); }
  };

  const handleBlock = async () => {
    if (!confirm(`Block @${displayPost.author.username}? Their posts will be hidden from your feed.`)) return;
    try {
      const blocked = await communityService.toggleBlockUser(displayPost.author.id, user.id);
      showToast(blocked ? `Blocked @${displayPost.author.username}` : 'User unblocked', 'success');
      setMenuOpen(false);
    } catch { showToast('Failed to block user', 'error'); }
  };

  const renderBody = (text: string) => {
    const parts = text.split(/(#\w+|@\w+|https?:\/\/[^\s]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#'))
        return <span key={i} className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">{part}</span>;
      if (part.startsWith('@'))
        return <span key={i} className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">{part}</span>;
      if (part.startsWith('http'))
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{part}</a>;
      return <span key={i}>{part}</span>;
    });
  };

  const avatar = displayPost.author.avatar;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-5 ${post.isPinned ? 'ring-2 ring-blue-400/50' : ''}`}
    >
      {/* Pinned badge */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <Pin className="w-3.5 h-3.5" /> Pinned by Admin
        </div>
      )}

      {/* Group badge */}
      {post.groupName && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            {post.groupName}
          </span>
        </div>
      )}

      {/* Repost header */}
      {post.isRepost && (
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
          <Repeat2 className="w-4 h-4" />
          <span><strong className="font-semibold">{post.author.name}</strong> reposted</span>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
          {avatar ? <img src={avatar} alt={displayPost.author.name} className="w-full h-full object-cover" /> : getInitials(displayPost.author.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{displayPost.author.name}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">@{displayPost.author.username}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(displayPost.createdAt)}</span>
            {displayPost.author.level && (
              <span className="badge bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 text-[10px]">{displayPost.author.level}</span>
            )}
          </div>
          {(displayPost.locationName || displayPost.landmark) && (
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {displayPost.locationName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{displayPost.locationName}</span>}
              {displayPost.landmark && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><MapPin className="w-3 h-3" />Near: {displayPost.landmark}</span>}
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-0 top-10 z-20 w-48 glass-card !rounded-xl p-1 shadow-lg">
                {displayPost.isOwn ? (
                  <>
                    <button onClick={() => { setEditOpen(true); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => { handleDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setReportOpen(true); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Flag className="w-4 h-4" /> Report Post
                    </button>
                    <button onClick={handleBlock} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Ban className="w-4 h-4" /> Block User
                    </button>
                  </>
                )}
                <button onClick={handleMute} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <BellOff className="w-4 h-4" /> {post.hasMuted ? 'Unmute' : 'Mute'} Conversation
                </button>
                {isAdmin && (
                  <button onClick={handlePin} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                    <Pin className="w-4 h-4" /> {post.isPinned ? 'Unpin' : 'Pin'} Post
                  </button>
                )}
                <button onClick={() => { handleShare(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Link2 className="w-4 h-4" /> Copy Link
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {displayPost.body && (
        <p className="mt-3 text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
          {renderBody(displayPost.body)}
        </p>
      )}

      {/* Link Preview */}
      {displayPost.linkPreview && displayPost.linkPreview.title && (
        <a href={displayPost.linkPreview.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group">
          {displayPost.linkPreview.image && (
            <img src={displayPost.linkPreview.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{displayPost.linkPreview.title}</p>
            {displayPost.linkPreview.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{displayPost.linkPreview.description}</p>
            )}
            <p className="text-xs text-blue-500 flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" />{new URL(displayPost.linkPreview.url).hostname}</p>
          </div>
        </a>
      )}

      {/* Media */}
      <MediaGallery media={displayPost.media} />

      {/* Poll */}
      {displayPost.poll && <PollCard poll={displayPost.poll} userId={user.id} />}

      {/* Scheduled badge */}
      {post.scheduledAt && new Date(post.scheduledAt) > new Date() && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <Send className="w-3.5 h-3.5" /> Scheduled for {new Date(post.scheduledAt).toLocaleString()}
        </div>
      )}

      {/* Engagement bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <ReactionBar
          postId={post.id}
          reactions={post.reactions}
          myReaction={post.myReaction}
          userId={user.id}
          onReactionChange={handleReactionChange}
        />

        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors">
          <MessageCircle className="w-4.5 h-4.5" />
          <span className="text-xs font-medium">{post.commentsCount}</span>
        </button>

        <button onClick={handleRepost} className={`flex items-center gap-1.5 text-sm transition-colors ${post.hasReposted ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'}`}>
          <Repeat2 className="w-4.5 h-4.5" />
          <span className="text-xs font-medium">{post.repostsCount}</span>
        </button>

        <button onClick={handleBookmark} className={`flex items-center gap-1.5 text-sm transition-colors ${post.hasBookmarked ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400 hover:text-blue-500'}`}>
          <Bookmark className={`w-4.5 h-4.5 ${post.hasBookmarked ? 'fill-current' : ''}`} />
        </button>

        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors">
          {shareCopied ? <span className="text-xs text-emerald-500">Copied!</span> : <Share2 className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Comments */}
      {showComments && <CommentThread postId={post.id} userId={user.id} />}

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Post">
        <div className="space-y-4">
          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={5} className="input-field resize-none" placeholder="What's on your mind?" />
          <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="input-field" placeholder="Location (optional)" />
          <input value={editLandmark} onChange={(e) => setEditLandmark(e.target.value)} className="input-field" placeholder="Nearby landmark (optional)" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal isOpen={reportOpen} onClose={() => setReportOpen(false)} title="Report Post" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Help us understand why you're reporting this post. Our moderation team will review it.</p>
          <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} rows={4} className="input-field resize-none" placeholder="Reason for reporting..." />
          <div className="flex justify-end gap-2">
            <button onClick={() => setReportOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleReport} disabled={saving} className="btn-primary !bg-red-600 !from-red-600 !to-red-500">{saving ? 'Sending...' : 'Submit Report'}</button>
          </div>
        </div>
      </Modal>
    </motion.article>
  );
}
