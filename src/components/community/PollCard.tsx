import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Check } from 'lucide-react';
import type { CommunityPoll } from '@/types';
import { communityService } from '@/services/communityService';
import { useToast } from '@/contexts/ToastContext';
import { timeAgo } from '@/utils/helpers';

interface PollCardProps {
  poll: CommunityPoll;
  userId: string;
  onVoted?: () => void;
}

export function PollCard({ poll, userId, onVoted }: PollCardProps) {
  const { showToast } = useToast();
  const [voting, setVoting] = useState(false);
  const [localPoll, setLocalPoll] = useState<CommunityPoll>(poll);

  const showResults = localPoll.hasVoted || localPoll.expired;

  const handleVote = async (optionId: string) => {
    if (localPoll.hasVoted || localPoll.expired || voting) return;
    setVoting(true);
    try {
      await communityService.votePoll(localPoll.id, optionId, userId);
      // Optimistic update
      const newOptions = localPoll.options.map((o) =>
        o.id === optionId ? { ...o, votes: o.votes + 1 } : o,
      );
      const totalVotes = newOptions.reduce((s, o) => s + o.votes, 0);
      setLocalPoll({
        ...localPoll,
        options: newOptions,
        totalVotes,
        hasVoted: true,
        votedOptionId: optionId,
      });
      onVoted?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to vote', 'error');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
      {localPoll.question && (
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{localPoll.question}</p>
        </div>
      )}

      <div className="space-y-2">
        {localPoll.options.map((option) => {
          const pct = localPoll.totalVotes > 0 ? (option.votes / localPoll.totalVotes) * 100 : 0;
          const isVoted = localPoll.votedOptionId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={showResults || voting}
              className={`relative w-full text-left rounded-xl overflow-hidden border transition-all duration-200 ${
                isVoted
                  ? 'border-blue-500 dark:border-blue-400'
                  : showResults
                    ? 'border-slate-200 dark:border-slate-700'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer'
              } ${showResults ? 'cursor-default' : ''}`}
            >
              {showResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`absolute inset-y-0 left-0 ${isVoted ? 'bg-blue-500/20 dark:bg-blue-400/20' : 'bg-slate-200 dark:bg-slate-700/50'}`}
                />
              )}
              <div className="relative flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                  {isVoted && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  {option.text}
                </span>
                {showResults && (
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {pct.toFixed(0)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{localPoll.totalVotes} {localPoll.totalVotes === 1 ? 'vote' : 'votes'}</span>
        {localPoll.expiresAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {localPoll.expired
              ? `Ended ${timeAgo(localPoll.expiresAt)}`
              : `Ends ${timeAgo(localPoll.expiresAt)}`}
          </span>
        )}
      </div>
    </div>
  );
}
