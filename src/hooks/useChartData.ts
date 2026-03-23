import { useQuery } from '@tanstack/react-query';
import type { PriceSnapshot } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type ChartPoint = { time: number; value: number };

/**
 * Fetch chart data for a single outcome using the batch endpoint.
 * Returns sorted chart points ready for lightweight-charts.
 */
export function useChartData(
  outcomeId: string,
  options?: { from?: string; limit?: number },
) {
  return useQuery<ChartPoint[]>({
    queryKey: ['chartData', outcomeId, options?.from, options?.limit],
    queryFn: async () => {
      const params = new URLSearchParams({ outcome_ids: outcomeId });
      if (options?.from) params.set('from', options.from);
      if (options?.limit) params.set('limit', String(options.limit));
      const res = await fetch(`${API_URL}/api/v1/price-snapshots/batch?${params}`);
      if (!res.ok) throw new Error('Failed to fetch chart data');
      const data: Record<string, PriceSnapshot[]> = await res.json();
      const snapshots = data[outcomeId] ?? [];
      return snapshots
        .filter((s) => s.price != null)
        .map((s) => ({
          time: Math.floor(new Date(s.capturedAt).getTime() / 1000),
          value: Number(s.price),
        }))
        .sort((a, b) => a.time - b.time);
    },
    enabled: !!outcomeId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch chart data for multiple outcomes in a single API call.
 * Returns a record mapping each outcomeId to its sorted chart points.
 */
export function useMultiChartData(
  outcomeIds: string[],
  options?: { from?: string; limit?: number },
) {
  const idsKey = outcomeIds.join(',');
  return useQuery<Record<string, ChartPoint[]>>({
    queryKey: ['multiChartData', idsKey, options?.from, options?.limit],
    queryFn: async () => {
      const params = new URLSearchParams({ outcome_ids: idsKey });
      if (options?.from) params.set('from', options.from);
      if (options?.limit) params.set('limit', String(options.limit));
      const res = await fetch(`${API_URL}/api/v1/price-snapshots/batch?${params}`);
      if (!res.ok) throw new Error('Failed to fetch chart data');
      const data: Record<string, PriceSnapshot[]> = await res.json();
      const result: Record<string, ChartPoint[]> = {};
      for (const id of outcomeIds) {
        const snapshots = data[id] ?? [];
        result[id] = snapshots
          .filter((s) => s.price != null)
          .map((s) => ({
            time: Math.floor(new Date(s.capturedAt).getTime() / 1000),
            value: Number(s.price),
          }))
          .sort((a, b) => a.time - b.time);
      }
      return result;
    },
    enabled: outcomeIds.length > 0 && outcomeIds.every(Boolean),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
