'use client';

import { useQuery } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface UserTrade {
  id: string;
  outcomeId: string;
  makerOrderId: string;
  takerOrderId: string;
  makerPubkey: string;
  takerPubkey: string;
  outcome: string;
  side: string;
  price: number;
  quantity: number;
  makerFee: number;
  takerFee: number;
  settlementStatus: string;
  settlementTx: string | null;
  settledAt: string | null;
  createdAt: string;
}

export function useUserTrades() {
  const { publicKeyBase58 } = useUnifiedWallet();

  return useQuery<UserTrade[]>({
    queryKey: ['userTrades', publicKeyBase58],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/trades?user=${publicKeyBase58}&limit=50`,
      );
      if (!res.ok) throw new Error('Failed to fetch trades');
      return res.json();
    },
    enabled: !!publicKeyBase58,
    staleTime: 30_000,
  });
}
