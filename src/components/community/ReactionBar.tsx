import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Heart, Sparkles, PartyPopper } from 'lucide-react';
import type { ReactionType, ReactionSummary } from '@/types';
import { communityService } from '@/services/communityService';
import { useToast } from '@/contexts/ToastContext';

interface ReactionBarProps {
  postId: string;
  reactions: ReactionSummary[];
  myReaction: ReactionType | null;
  userId: string;
  onReactionChange: (type: ReactionType | null) => void;
}

const REACTION_TYPES: { type: ReactionType; icon: typeof ThumbsUp; label: string; color: string; bgColor: string }[] = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-red-500', bgColor: 'bg-red-500' },
  { type: 'wow', icon: Sparkles, label: 'Wow', color: 'text-amber-500', bgColor: 'bg-amber-500' },
  { type: 'celebrate', icon: PartyPopper, label: 'Celebrate', color: 'text-emerald-500', bgColor: 'bg-emerald-500' },
];

export function ReactionBar({ postId, reactions, myReaction, userId, onReactionChange }: ReactionBarProps) {
  const { showToast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReact = async (type: ReactionType) => {
    if (loading) return;
    setLoading(true);
    setPickerOpen(false);
    try {
      const result = await communityService.togglePostReaction(postId, type, userId);
      onReactionChange(result);
    } catch (err: any) {
      showToast('Failed to react', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReact = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Quick click = toggle 'like' reaction
      const result = await communityService.togglePostReaction(postId, 'like', userId);
      onReactionChange(result);
    } catch (err: any) {
      showToast('Failed to react', 'error');
    } finally {
      setLoading(false);
    }
  };

  const MyIcon = myReaction
    ? REACTION_TYPES.find((r) => r.type === myReaction)?.icon ?? ThumbsUp
    : ThumbsUp;
  const myColor = myReaction
    ? REACTION_TYPES.find((r) => r.type === myReaction)?.color ?? 'text-slate-500'
    : 'text-slate-500';

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={handleQuickReact}
          onContextMenu={(e) => { e.preventDefault(); setPickerOpen(!pickerOpen); }}
          onMouseEnter={() => setPickerOpen(true)}
          disabled={loading}
          className={`flex items-center gap-1.5 text-sm transition-colors ${myColor} hover:opacity-80`}
        >
          <MyIcon className={`w-4.5 h-4.5 ${myReaction ? 'fill-current' : ''}`} />
          <span className="text-xs font-medium">
            {myReaction ? REACTION_TYPES.find((r) => r.type === myReaction)?.label : 'React'}
          </span>
        </button>

        {/* Existing reaction summary chips */}
        {reactions.length > 0 && (
          <div className="flex items-center gap-0.5 ml-1">
            {reactions.map((r) => {
              const config = REACTION_TYPES.find((rt) => rt.type === r.type);
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div
                  key={r.type}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${config.bgColor}/10 ${config.color}`}
                  title={`${r.count} ${config.label}`}
                >
                  <Icon className="w-3 h-3" />
                  {r.count > 1 && <span className="text-[10px] font-bold">{r.count}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reaction picker */}
      <AnimatePresence>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute bottom-10 left-0 z-20 flex items-center gap-1 glass-card !rounded-full p-2 shadow-lg"
              onMouseLeave={() => setPickerOpen(false)}
            >
              {REACTION_TYPES.map((rt) => {
                const Icon = rt.icon;
                const isMine = myReaction === rt.type;
                return (
                  <button
                    key={rt.type}
                    onClick={() => handleReact(rt.type)}
                    className={`p-2 rounded-full transition-all hover:scale-125 hover:-translate-y-1 ${isMine ? rt.bgColor : 'bg-slate-100 dark:bg-slate-700'}`}
                    title={rt.label}
                  >
                    <Icon className={`w-5 h-5 ${isMine ? 'text-white' : rt.color}`} />
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Comment Reactions ============

interface CommentReactionBarProps {
  commentId: string;
  reactions: ReactionSummary[];
  myReaction: ReactionType | null;
  userId: string;
  onReactionChange: (type: ReactionType | null) => void;
}

export function CommentReactionBar({ commentId, reactions, myReaction, userId, onReactionChange }: CommentReactionBarProps) {
  const { showToast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReact = async (type: ReactionType) => {
    if (loading) return;
    setLoading(true);
    setPickerOpen(false);
    try {
      const result = await communityService.toggleCommentReaction(commentId, type, userId);
      onReactionChange(result);
    } catch (err: any) {
      showToast('Failed to react', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReact = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await communityService.toggleCommentReaction(commentId, 'like', userId);
      onReactionChange(result);
    } catch (err: any) {
      showToast('Failed to react', 'error');
    } finally {
      setLoading(false);
    }
  };

  const MyIcon = myReaction
    ? REACTION_TYPES.find((r) => r.type === myReaction)?.icon ?? ThumbsUp
    : ThumbsUp;
  const myColor = myReaction
    ? REACTION_TYPES.find((r) => r.type === myReaction)?.color ?? 'text-slate-500'
    : 'text-slate-500';

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={handleQuickReact}
          onContextMenu={(e) => { e.preventDefault(); setPickerOpen(!pickerOpen); }}
          disabled={loading}
          className={`flex items-center gap-1 text-xs transition-colors ${myColor} hover:opacity-80`}
        >
          <MyIcon className={`w-3.5 h-3.5 ${myReaction ? 'fill-current' : ''}`} />
          {myReaction ? REACTION_TYPES.find((r) => r.type === myReaction)?.label : 'React'}
        </button>

        {reactions.length > 0 && (
          <div className="flex items-center gap-0.5 ml-0.5">
            {reactions.map((r) => {
              const config = REACTION_TYPES.find((rt) => rt.type === r.type);
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div key={r.type} className={`flex items-center ${config.color}`} title={`${r.count} ${config.label}`}>
                  <Icon className="w-2.5 h-2.5" />
                  {r.count > 1 && <span className="text-[9px] font-bold">{r.count}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute top-6 left-0 z-20 flex items-center gap-1 glass-card !rounded-full p-1.5 shadow-lg"
              onMouseLeave={() => setPickerOpen(false)}
            >
              {REACTION_TYPES.map((rt) => {
                const Icon = rt.icon;
                const isMine = myReaction === rt.type;
                return (
                  <button
                    key={rt.type}
                    onClick={() => handleReact(rt.type)}
                    className={`p-1.5 rounded-full transition-all hover:scale-125 ${isMine ? rt.bgColor : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    title={rt.label}
                  >
                    <Icon className={`w-4 h-4 ${isMine ? 'text-white' : rt.color}`} />
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
