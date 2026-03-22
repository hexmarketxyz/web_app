'use client';

import { ReactNode, useMemo } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from './WebSocketProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthTokenProvider } from './AuthTokenProvider';
import { ApiCredentialsProvider } from './ApiCredentialsProvider';
import { PrivyWalletProvider } from './PrivyWalletProvider';
import { OkxWalletProvider } from './OkxWalletProvider';
import { SessionKeyProvider } from './SessionKeyProvider';
import { isOkxWalletBrowser } from '@/lib/okxDetect';

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

function PrivyStack({ children }: { children: ReactNode }) {
  return (
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
      <PrivyWalletProvider>
        {children}
      </PrivyWalletProvider>
    </PrivyProvider>
  );
}

function OkxStack({ children }: { children: ReactNode }) {
  return (
    <OkxWalletProvider>
      {children}
    </OkxWalletProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const isOkx = useMemo(() => isOkxWalletBrowser(), []);

  const WalletStack = isOkx ? OkxStack : PrivyStack;

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <WalletStack>
          <SessionKeyProvider>
            <AuthTokenProvider>
              <ApiCredentialsProvider>
                <ThemeProvider>
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </ThemeProvider>
              </ApiCredentialsProvider>
            </AuthTokenProvider>
          </SessionKeyProvider>
        </WalletStack>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
