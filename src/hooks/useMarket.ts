import { useQuery } from '@tanstack/react-query';
import type { Outcome } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useMarkets() {
  return useQuery<Outcome[]>({
    queryKey: ['markets'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/markets`);
      if (!res.ok) throw new Error('Failed to fetch markets');
      return res.json();
    },
  });
}

export function useMarket(outcomeId: string) {
  return useQuery<Outcome>({
    queryKey: ['market', outcomeId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/markets/${outcomeId}`);
      if (!res.ok) throw new Error('Failed to fetch market');
      return res.json();
    },
    enabled: !!outcomeId,
  });
}
