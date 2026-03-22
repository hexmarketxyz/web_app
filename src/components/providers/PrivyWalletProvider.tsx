'use client';

import { type ReactNode, useMemo, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignMessage, useSignTransaction } from '@privy-io/react-auth/solana';
import { PublicKey, Transaction } from '@solana/web3.js';
import { UnifiedWalletContext, type UnifiedWallet } from '@/hooks/useUnifiedWallet';

export function PrivyWalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout, login } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage: privySignMessage } = useSignMessage();
  const { signTransaction: privySignTransaction } = useSignTransaction();

  const embeddedWallet = useMemo(
    () =>
      wallets.find((w) => {
        const sw = w.standardWallet as { isPrivyWallet?: boolean } | undefined;
        return sw?.isPrivyWallet === true;
      }),
    [wallets],
  );

  const externalWallet = useMemo(
    () =>
      wallets.find((w) => {
        const sw = w.standardWallet as { isPrivyWallet?: boolean } | undefined;
        return sw?.isPrivyWallet !== true;
      }),
    [wallets],
  );

  // Prefer embedded, fall back to external
  const activeWallet = embeddedWallet ?? externalWallet;
  const isEmbedded = activeWallet === embeddedWallet && !!embeddedWallet;

  const wrappedSignMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!activeWallet) throw new Error('No wallet connected');
      const { signature } = await privySignMessage({
        message,
        wallet: activeWallet,
      });
      return signature;
    },
    [activeWallet, privySignMessage],
  );

  const wrappedSignTransaction = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      if (!activeWallet) throw new Error('No wallet connected');
      const serialized = transaction.serialize({ requireAllSignatures: false });
      const { signedTransaction } = await privySignTransaction({
        transaction: serialized,
        wallet: activeWallet,
      });
      return Transaction.from(signedTransaction);
    },
    [activeWallet, privySignTransaction],
  );

  const value = useMemo((): UnifiedWallet => {
    if (!ready) {
      return {
        publicKey: null,
        publicKeyBase58: null,
        connected: false,
        connecting: true,
        signMessage: null,
        signTransaction: null,
        walletType: null,
        walletLabel: '',
        ready: false,
        login: () => {},
        disconnect: async () => {},
      };
    }

    if (!authenticated || !activeWallet) {
      return {
        publicKey: null,
        publicKeyBase58: null,
        connected: false,
        connecting: false,
        signMessage: null,
        signTransaction: null,
        walletType: null,
        walletLabel: '',
        ready: true,
        login: () => login(),
        disconnect: async () => {},
      };
    }

    let publicKey: PublicKey | null = null;
    try {
      publicKey = new PublicKey(activeWallet.address);
    } catch {
      // invalid address
    }

    const walletType = isEmbedded ? 'privy' : 'external';
    const walletLabel = isEmbedded
      ? user?.email?.address ?? 'Privy Wallet'
      : (activeWallet.standardWallet as { name?: string })?.name ?? 'External Wallet';

    return {
      publicKey,
      publicKeyBase58: activeWallet.address,
      connected: true,
      connecting: false,
      signMessage: wrappedSignMessage,
      signTransaction: wrappedSignTransaction,
      walletType,
      walletLabel,
      ready: true,
      login: () => login(),
      disconnect: logout,
    };
  }, [ready, authenticated, activeWallet, isEmbedded, user, wrappedSignMessage, wrappedSignTransaction, login, logout]);

  return (
    <UnifiedWalletContext.Provider value={value}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}
