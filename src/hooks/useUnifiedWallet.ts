'use client';

import { useMemo, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignMessage, useSignTransaction } from '@privy-io/react-auth/solana';
import { PublicKey, Transaction } from '@solana/web3.js';

export interface UnifiedWallet {
  publicKey: PublicKey | null;
  publicKeyBase58: string | null;
  connected: boolean;
  connecting: boolean;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null;
  signTransaction: ((transaction: Transaction) => Promise<Transaction>) | null;
  walletType: 'privy' | 'external' | null;
  walletLabel: string;
  disconnect: () => Promise<void>;
}

export function useUnifiedWallet(): UnifiedWallet {
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage: privySignMessage } = useSignMessage();
  const { signTransaction: privySignTransaction } = useSignTransaction();

  // Find embedded (Privy) wallet and first external wallet
  const embeddedWallet = useMemo(
    () => wallets.find((w) => {
      const sw = w.standardWallet as { isPrivyWallet?: boolean } | undefined;
      return sw?.isPrivyWallet === true;
    }),
    [wallets],
  );

  const externalWallet = useMemo(
    () => wallets.find((w) => {
      const sw = w.standardWallet as { isPrivyWallet?: boolean } | undefined;
      return sw?.isPrivyWallet !== true;
    }),
    [wallets],
  );

  // Pick the active wallet: prefer embedded, fall back to external
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
      // Privy expects serialized transaction bytes (Uint8Array)
      const serialized = transaction.serialize({ requireAllSignatures: false });
      const { signedTransaction } = await privySignTransaction({
        transaction: serialized,
        wallet: activeWallet,
      });
      // signedTransaction is Uint8Array — deserialize back
      return Transaction.from(signedTransaction);
    },
    [activeWallet, privySignTransaction],
  );

  return useMemo((): UnifiedWallet => {
    // Privy not ready yet
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
        disconnect: async () => {},
      };
    }

    // Not authenticated
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
        disconnect: async () => {},
      };
    }

    // Connected
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
      disconnect: logout,
    };
  }, [ready, authenticated, activeWallet, isEmbedded, user, wrappedSignMessage, wrappedSignTransaction, logout]);
}
