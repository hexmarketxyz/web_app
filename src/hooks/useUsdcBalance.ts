'use client';

import { useQuery } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useApiCreds } from '@/components/providers/ApiCredentialsProvider';
import { buildL2Headers } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface BalanceResponse {
  userPubkey: string;
  usdcBalance: number;
  updatedAt: string | null;
}

export function useUsdcBalance() {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { credentials } = useApiCreds();

  return useQuery<BalanceResponse>({
    queryKey: ['usdcBalance', publicKeyBase58],
    queryFn: async () => {
      const path = `/api/v1/balances?user=${publicKeyBase58}`;
      const l2Headers = await buildL2Headers(credentials!, publicKeyBase58!, 'GET', path);

      const res = await fetch(`${API_URL}${path}`, { headers: l2Headers });
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    enabled: !!publicKeyBase58 && !!credentials,
  });
}
