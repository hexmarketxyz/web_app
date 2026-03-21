'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useApiCreds } from '@/components/providers/ApiCredentialsProvider';
import { buildL2Headers } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useClaimAirdrop() {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { credentials } = useApiCreds();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!credentials || !publicKeyBase58) throw new Error('API credentials not ready');

      const path = '/api/v1/airdrop/claim';
      const l2Headers = await buildL2Headers(credentials, publicKeyBase58, 'POST', path);

      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: l2Headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to claim airdrop');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
      queryClient.invalidateQueries({ queryKey: ['vaultBalance'] });
    },
  });
}
