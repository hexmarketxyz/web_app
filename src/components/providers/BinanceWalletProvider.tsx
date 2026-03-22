'use client';

import { type ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { UnifiedWalletContext, type UnifiedWallet } from '@/hooks/useUnifiedWallet';
import { getBinanceSolanaProvider } from '@/lib/binanceDetect';

export function BinanceWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);

  // Auto-connect on mount
  useEffect(() => {
    let cancelled = false;
    const provider = getBinanceSolanaProvider();
    if (!provider) {
      setConnecting(false);
      return;
    }

    // If already connected, grab the key
    if (provider.publicKey) {
      setAddress(provider.publicKey.toBase58());
      setConnecting(false);
      return;
    }

    provider
      .connect()
      .then((resp) => {
        if (!cancelled) setAddress(resp.publicKey.toBase58());
      })
      .catch((err) => {
        console.error('Binance wallet connect failed:', err);
      })
      .finally(() => {
        if (!cancelled) setConnecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    const provider = getBinanceSolanaProvider();
    if (!provider) return;
    setConnecting(true);
    provider
      .connect()
      .then((resp) => setAddress(resp.publicKey.toBase58()))
      .catch((err) => console.error('Binance wallet connect failed:', err))
      .finally(() => setConnecting(false));
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getBinanceSolanaProvider();
    if (provider) {
      await provider.disconnect().catch(() => {});
    }
    setAddress(null);
  }, []);

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      const provider = getBinanceSolanaProvider();
      if (!provider) throw new Error('Binance wallet not available');
      const { signature } = await provider.signMessage(message);
      return signature;
    },
    [],
  );

  const signTransaction = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      const provider = getBinanceSolanaProvider();
      if (!provider) throw new Error('Binance wallet not available');
      const signed = await provider.signTransaction(transaction);
      if (signed instanceof Transaction) return signed;
      return Transaction.from(Buffer.from(signed as Uint8Array));
    },
    [],
  );

  const value = useMemo((): UnifiedWallet => {
    const connected = !!address;

    let publicKey: PublicKey | null = null;
    if (address) {
      try {
        publicKey = new PublicKey(address);
      } catch {
        // invalid
      }
    }

    return {
      publicKey,
      publicKeyBase58: address,
      connected,
      connecting,
      signMessage: connected ? signMessage : null,
      signTransaction: connected ? signTransaction : null,
      walletType: connected ? 'binance' : null,
      walletLabel: connected ? 'Binance Wallet' : '',
      ready: !connecting,
      login,
      disconnect,
    };
  }, [address, connecting, signMessage, signTransaction, login, disconnect]);

  return (
    <UnifiedWalletContext.Provider value={value}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}
