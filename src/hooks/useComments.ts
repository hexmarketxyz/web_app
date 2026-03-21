import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HexComment } from '@hexmarket/sdk';
import { useAuth } from '@/components/providers/AuthTokenProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useComments(eventId?: string, outcomeId?: string) {
  return useQuery<HexComment[]>({
    queryKey: ['comments', eventId, outcomeId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (eventId) params.set('event_id', eventId);
      if (outcomeId) params.set('outcome_id', outcomeId);
      const res = await fetch(`${API_URL}/api/v1/comments?${params}`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      return res.json();
    },
    enabled: !!(eventId || outcomeId),
  });
}

export function useCreateComment(eventId?: string, outcomeId?: string) {
  const queryClient = useQueryClient();
  const { authToken } = useAuth();

  return useMutation({
    mutationFn: async (params: { body: string; parentId?: string }) => {
      if (!authToken) throw new Error('Auth token not ready');
      const res = await fetch(`${API_URL}/api/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          eventId,
          outcomeId,
          parentId: params.parentId,
          body: params.body,
        }),
      });
      if (!res.ok) throw new Error('Failed to create comment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', eventId, outcomeId] });
    },
  });
}

export function useVoteComment(eventId?: string, outcomeId?: string) {
  const queryClient = useQueryClient();
  const { authToken } = useAuth();

  return useMutation({
    mutationFn: async (params: { commentId: string; up: boolean }) => {
      if (!authToken) throw new Error('Auth token not ready');
      const res = await fetch(`${API_URL}/api/v1/comments/${params.commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ up: params.up }),
      });
      if (!res.ok) throw new Error('Failed to vote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', eventId, outcomeId] });
    },
  });
}
