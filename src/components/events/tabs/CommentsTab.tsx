'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useComments, useCreateComment, useVoteComment } from '@/hooks/useComments';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { PixelAvatar } from '@/components/ui/PixelAvatar';

interface CommentsTabProps {
  eventId: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function shortPubkey(pubkey: string): string {
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

export function CommentsTab({ eventId }: CommentsTabProps) {
  const { data: comments, isLoading } = useComments(eventId);
  const createComment = useCreateComment(eventId);
  const voteComment = useVoteComment(eventId);
  const { connected } = useUnifiedWallet();
  const [body, setBody] = useState('');
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    createComment.mutate({ body: body.trim() }, {
      onSuccess: () => setBody(''),
    });
  };

  if (isLoading) return <div className="text-theme-secondary text-sm">{t('common.loadingComments')}</div>;

  return (
    <div className="space-y-4">
      {/* Comment form */}
      {connected && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('comments.placeholder')}
            className="flex-1 bg-hex-dark border border-hex-border rounded-lg px-3 py-2 text-sm text-theme-primary focus:border-hex-blue focus:outline-none"
          />
          <button
            type="submit"
            disabled={!body.trim() || createComment.isPending}
            className="bg-hex-blue text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition"
          >
            {t('comments.post')}
          </button>
        </form>
      )}

      {/* Comments list */}
      {comments?.length === 0 ? (
        <div className="text-theme-tertiary text-sm text-center py-6">
          {t('comments.noComments')}
        </div>
      ) : (
        <div className="space-y-3">
          {comments?.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <PixelAvatar address={comment.userPubkey} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-theme-secondary">
                  <span className="font-mono">{shortPubkey(comment.userPubkey)}</span>
                  <span>·</span>
                  <span>{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-theme-primary mt-1">{comment.body}</p>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => voteComment.mutate({ commentId: comment.id, up: true })}
                    className="text-xs text-theme-tertiary hover:text-hex-green transition"
                  >
                    ▲ {comment.upvotes}
                  </button>
                  <button
                    onClick={() => voteComment.mutate({ commentId: comment.id, up: false })}
                    className="text-xs text-theme-tertiary hover:text-hex-red transition"
                  >
                    ▼ {comment.downvotes}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
