'use client';

import { useQuery } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useApiCreds } from '@/components/providers/ApiCredentialsProvider';
import { buildL2Headers } from '@hexmarket/sdk';
import type { Order } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useAllOpenOrders() {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { credentials } = useApiCreds();

  return useQuery<Order[]>({
    queryKey: ['allOpenOrders', publicKeyBase58],
    queryFn: async () => {
      const path = `/api/v1/orders?user=${publicKeyBase58}`;
      const l2Headers = await buildL2Headers(credentials!, publicKeyBase58!, 'GET', path);

      const res = await fetch(`${API_URL}${path}`, { headers: l2Headers });
      if (!res.ok) throw new Error('Failed to fetch open orders');
      return res.json();
    },
    enabled: !!publicKeyBase58 && !!credentials,
  });
}
