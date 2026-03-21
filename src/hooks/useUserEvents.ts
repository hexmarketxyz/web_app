'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useAuth } from '@/components/providers/AuthTokenProvider';

const POLL_INTERVAL_MS = 3_000;

/**
 * Poll for user-specific events (order fills, cancellations).
 * Invalidates openOrders and balance queries periodically while the user
 * is authenticated.  The /ws/user endpoint requires L2 API key auth which
 * is not available to frontend wallet users, so we poll instead.
 */
export function useUserEvents() {
  const { publicKeyBase58 } = useUnifiedWallet();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();

  useEffect(() => {
    if (!publicKeyBase58 || !authToken) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
      queryClient.invalidateQueries({ queryKey: ['userTrades'] });
      queryClient.invalidateQueries({ queryKey: ['event'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [publicKeyBase58, authToken, queryClient]);
}
