'use client';

import { useQuery } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import type { Order } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useOpenOrders(outcomeId: string) {
  const { publicKey } = useUnifiedWallet();

  return useQuery<Order[]>({
    queryKey: ['openOrders', outcomeId, publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return [];
      const query = new URLSearchParams({
        user: publicKey.toBase58(),
        outcome_id: outcomeId,
      });
      const res = await fetch(`${API_URL}/api/v1/orders?${query}`);
      if (!res.ok) throw new Error('Failed to fetch open orders');
      return res.json();
    },
    enabled: !!publicKey,
  });
}
