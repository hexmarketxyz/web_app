'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useApiCreds } from '@/components/providers/ApiCredentialsProvider';
import { OrdersApi, buildL2Headers } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const ordersApi = new OrdersApi(API_URL);

export function useCancelOrder() {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { credentials } = useApiCreds();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!credentials || !publicKeyBase58) throw new Error('API credentials not ready');

      const path = `/api/v1/orders/${orderId}`;
      const l2Headers = await buildL2Headers(credentials, publicKeyBase58, 'DELETE', path);
      ordersApi.setL2Headers(l2Headers);
      await ordersApi.cancel(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOpenOrders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioPositions'] });
      queryClient.invalidateQueries({ queryKey: ['userTrades'] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
    },
  });
}
