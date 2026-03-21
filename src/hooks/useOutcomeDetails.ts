'use client';

import { useQueries } from '@tanstack/react-query';
import type { Outcome } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface OutcomeEventContext {
  eventSlug: string;
  eventTitle: string;
  eventTitleTranslations: Record<string, string>;
  eventIconUrl: string | null;
  marketTitle: string;
  marketTitleTranslations: Record<string, string>;
  marketIconUrl: string | null;
  marketCount: number;
}

export type { OutcomeEventContext };

/** Fetch outcome details + event context for a set of outcome IDs. */
export function useOutcomeDetails(outcomeIds: string[]) {
  const unique = [...new Set(outcomeIds)];

  const outcomeQueries = useQueries({
    queries: unique.map((id) => ({
      queryKey: ['outcome', id],
      queryFn: async (): Promise<Outcome> => {
        const res = await fetch(`${API_URL}/api/v1/markets/${id}`);
        if (!res.ok) throw new Error(`Failed to fetch outcome ${id}`);
        return res.json();
      },
      staleTime: 60_000,
    })),
  });

  const eventContextQueries = useQueries({
    queries: unique.map((id) => ({
      queryKey: ['outcomeEvent', id],
      queryFn: async (): Promise<OutcomeEventContext> => {
        const res = await fetch(`${API_URL}/api/v1/markets/${id}/event`);
        if (!res.ok) throw new Error(`Failed to fetch event for ${id}`);
        return res.json();
      },
      staleTime: 60_000,
    })),
  });

  const outcomeMap = new Map<string, Outcome>();
  const eventSlugMap = new Map<string, string>();
  const eventContextMap = new Map<string, OutcomeEventContext>();

  unique.forEach((id, i) => {
    if (outcomeQueries[i]?.data) {
      outcomeMap.set(id, outcomeQueries[i].data!);
    }
    if (eventContextQueries[i]?.data) {
      const ctx = eventContextQueries[i].data!;
      eventSlugMap.set(id, ctx.eventSlug);
      eventContextMap.set(id, ctx);
    }
  });

  const isLoading = outcomeQueries.some((q) => q.isLoading) || eventContextQueries.some((q) => q.isLoading);

  return { outcomeMap, eventSlugMap, eventContextMap, isLoading };
}
