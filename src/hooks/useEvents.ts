import { useQuery } from '@tanstack/react-query';
import type { EventListItem, EventDetail } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useEvents(tagSlug?: string, status?: string) {
  return useQuery<EventListItem[]>({
    queryKey: ['events', tagSlug, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tagSlug) params.set('tag', tagSlug);
      if (status) params.set('status', status);
      const res = await fetch(`${API_URL}/api/v1/events?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useEvent(slug: string) {
  return useQuery<EventDetail>({
    queryKey: ['event', slug],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/events/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json();
    },
    enabled: !!slug,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
