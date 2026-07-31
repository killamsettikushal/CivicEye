import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Trash2, Reply, CornerDownRight } from 'lucide-react';
import type { CommunityComment, ReactionType } from '@/types';
import { communityService } from '@/services/communityService';
import { useToast } from '@/contexts/ToastContext';
import { timeAgo, getInitials } from '@/utils/helpers';
import { CommentReactionBar } from './ReactionBar';

interface CommentThreadProps {
  postId: string;
  userId: string;
}

export function CommentThread({ postId, userId }: CommentThreadProps) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadComments(); }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await communityService.getComments(postId, userId);
      setComments(data);
    } catch { showToast('Failed to load comments', 'error'); }
    finally { setLoading(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await communityService.addComment(postId, userId, newComment.trim());
      setNewComment('');
      await loadComments();
      showToast('Comment added', 'success');
    } catch { showToast('Failed to add comment', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleReply = async (parentId: string) => {
    if (!replyBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      await communityService.addComment(postId, userId, replyBody.trim(), parentId);
      setReplyBody(''); setReplyingTo(null);
      await loadComments();
      showToast('Reply added', 'success');
    } catch { showToast('Failed to add reply', 'error'); }
    finally { setSubmitting(false); }
  };

  const updateCommentReaction = (commentId: string, type: ReactionType | null, isReply: boolean = false) => {
    setComments((prev) => prev.map((c) => {
      if (c.id === commentId) return { ...c, myReaction: type };
      if (c.replies) {
        return {
          ...c,
          replies: c.replies.map((r) => r.id === commentId ? { ...r, myReaction: type } : r),
        };
      }
      return c;
    }));
  };

  const handleDeleteComment = async (comment: CommunityComment) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await communityService.deleteComment(comment.id, userId, postId);
      await loadComments();
      showToast('Comment deleted', 'success');
    } catch { showToast('Failed to delete comment', 'error'); }
  };

  const renderComment = (c: CommunityComment, isReply = false) => (
    <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${isReply ? 'ml-11' : ''}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
        {c.authorAvatar ? <img src={c.authorAvatar} alt={c.authorName} className="w-full h-full object-cover" /> : getInitials(c.authorName)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.authorName}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">@{c.authorUsername}</span>
            <span className="text-xs text-slate-400">· {timeAgo(c.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-100 mt-1 whitespace-pre-wrap break-words">{c.body}</p>
        </div>

        <div className="flex items-center gap-3 mt-1.5 ml-1">
          <CommentReactionBar
            commentId={c.id}
            reactions={c.reactions ?? []}
            myReaction={c.myReaction ?? null}
            userId={userId}
            onReactionChange={(type) => updateCommentReaction(c.id, type, isReply)}
          />
          {!isReply && (
            <button onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyBody(''); }} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors">
              <Reply className="w-3.5 h-3.5" /> Reply
            </button>
          )}
          {c.authorId === userId && (
            <button onClick={() => handleDeleteComment(c)} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>

        {replyingTo === c.id && (
          <div className="flex gap-2 mt-2 ml-1">
            <input value={replyBody} onChange={(e) => setReplyBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReply(c.id)} placeholder={`Reply to @${c.authorUsername}...`} className="input-field !py-2 !text-sm flex-1" autoFocus />
            <button onClick={() => handleReply(c.id)} disabled={submitting || !replyBody.trim()} className="btn-primary !px-3 !py-2"><Send className="w-4 h-4" /></button>
          </div>
        )}

        {c.replies && c.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {c.replies.map((r) => (
              <div key={r.id}>
                <div className="flex items-center gap-1 text-xs text-slate-400 mb-1 ml-1"><CornerDownRight className="w-3 h-3" /><span>Reply</span></div>
                {renderComment(r, true)}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
      <div className="flex gap-2">
        <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} placeholder="Write a comment..." className="input-field !py-2 !text-sm flex-1" />
        <button onClick={handleAddComment} disabled={submitting || !newComment.trim()} className="btn-primary !px-3 !py-2"><Send className="w-4 h-4" /></button>
      </div>

      {loading ? <p className="text-sm text-slate-400 text-center py-4">Loading comments...</p>
        : comments.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No comments yet. Start the conversation.</p>
        : <div className="space-y-4">{comments.map((c) => renderComment(c))}</div>}
    </div>
  );
}
