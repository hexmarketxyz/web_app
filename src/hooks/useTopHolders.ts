import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Holder {
  id: string;
  userPubkey: string;
  outcomeId: string;
  yesQuantity: number;
  noQuantity: number;
  realizedPnl: number;
  updatedAt: string;
}

export function useTopHolders(eventId: string, limit = 20) {
  return useQuery<Holder[]>({
    queryKey: ['topHolders', eventId, limit],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/events/${eventId}/holders?limit=${limit}`
      );
      if (!res.ok) throw new Error('Failed to fetch top holders');
      return res.json();
    },
    enabled: !!eventId,
  });
}
