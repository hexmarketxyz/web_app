import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type { EventListItem, EventDetail, SeriesSibling } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const PAGE_SIZE = 18;

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
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useInfiniteEvents(tagSlug?: string, sort = 'volume') {
  return useInfiniteQuery<EventListItem[]>({
    queryKey: ['events-infinite', tagSlug, sort],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      if (tagSlug) params.set('tag', tagSlug);
      params.set('sort', sort);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(pageParam));
      const res = await fetch(`${API_URL}/api/v1/events?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSeriesSiblings(eventId?: string) {
  return useQuery<SeriesSibling[]>({
    queryKey: ['series-siblings', eventId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/events/${eventId}/series-siblings`);
      if (!res.ok) throw new Error('Failed to fetch series siblings');
      return res.json();
    },
    enabled: !!eventId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
