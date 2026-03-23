'use client';

import { useQuery } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useApiCreds } from '@/components/providers/ApiCredentialsProvider';
import { buildL2Headers } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Position {
  id: string;
  userPubkey: string;
  outcomeId: string;
  quantity: number;
  avgPrice: number | null;
  realizedPnl: number;
  updatedAt: string;
}

export function usePortfolioPositions() {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { credentials } = useApiCreds();

  return useQuery<Position[]>({
    queryKey: ['portfolioPositions', publicKeyBase58],
    queryFn: async () => {
      const path = `/api/v1/positions?user=${publicKeyBase58}`;
      const l2Headers = await buildL2Headers(credentials!, publicKeyBase58!, 'GET', path);

      const res = await fetch(`${API_URL}${path}`, { headers: l2Headers });
      if (!res.ok) throw new Error('Failed to fetch positions');
      return res.json();
    },
    enabled: !!publicKeyBase58 && !!credentials,
    staleTime: 30_000,
  });
}
