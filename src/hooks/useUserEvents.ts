'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useAuth } from '@/components/providers/AuthTokenProvider';

const POLL_INTERVAL_MS = 15_000;

/**
 * Poll for user-specific data (order fills, cancellations, balance changes).
 * Only invalidates user-specific queries — NOT event/market data which is
 * shared and expensive to refetch.
 */
export function useUserEvents() {
  const { publicKeyBase58 } = useUnifiedWallet();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();

  useEffect(() => {
    if (!publicKeyBase58 || !authToken) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
      queryClient.invalidateQueries({ queryKey: ['allOpenOrders'] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
      queryClient.invalidateQueries({ queryKey: ['userTrades'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioPositions'] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [publicKeyBase58, authToken, queryClient]);
}
