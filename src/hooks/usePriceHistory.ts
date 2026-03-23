import { useQuery } from '@tanstack/react-query';
import type { PriceSnapshot } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function usePriceHistory(
  outcomeId: string,
  options?: { from?: string; to?: string; limit?: number }
) {
  return useQuery<PriceSnapshot[]>({
    queryKey: ['priceHistory', outcomeId, options],
    queryFn: async () => {
      const params = new URLSearchParams({ outcome_id: outcomeId });
      if (options?.from) params.set('from', options.from);
      if (options?.to) params.set('to', options.to);
      if (options?.limit) params.set('limit', String(options.limit));
      const res = await fetch(`${API_URL}/api/v1/price-snapshots?${params}`);
      if (!res.ok) throw new Error('Failed to fetch price history');
      return res.json();
    },
    enabled: !!outcomeId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useSparkline(outcomeId: string) {
  return useQuery<PriceSnapshot[]>({
    queryKey: ['sparkline', outcomeId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/price-snapshots/sparkline?outcome_id=${outcomeId}`
      );
      if (!res.ok) throw new Error('Failed to fetch sparkline');
      return res.json();
    },
    enabled: !!outcomeId,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}
