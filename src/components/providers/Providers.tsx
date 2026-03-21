'use client';

import { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from './WebSocketProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthTokenProvider } from './AuthTokenProvider';
import { ApiCredentialsProvider } from './ApiCredentialsProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        config={{
          loginMethods: ['email', 'google', 'apple', 'discord', 'wallet'],
          appearance: {
            walletChainType: 'solana-only',
          },
          embeddedWallets: {
            solana: {
              createOnLogin: 'users-without-wallets',
            },
          },
          externalWallets: {
            solana: {
              connectors: solanaConnectors,
            },
          },
        }}
      >
        <AuthTokenProvider>
          <ApiCredentialsProvider>
            <ThemeProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ThemeProvider>
          </ApiCredentialsProvider>
        </AuthTokenProvider>
      </PrivyProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
