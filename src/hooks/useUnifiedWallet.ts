'use client';

import { createContext, useContext } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';

export interface UnifiedWallet {
  publicKey: PublicKey | null;
  publicKeyBase58: string | null;
  connected: boolean;
  connecting: boolean;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null;
  signTransaction: ((transaction: Transaction) => Promise<Transaction>) | null;
  walletType: 'privy' | 'external' | 'okx' | null;
  walletLabel: string;
  /** true once the wallet provider is initialized */
  ready: boolean;
  /** Trigger login / wallet connection */
  login: () => void;
  disconnect: () => Promise<void>;
}

const defaultWallet: UnifiedWallet = {
  publicKey: null,
  publicKeyBase58: null,
  connected: false,
  connecting: false,
  signMessage: null,
  signTransaction: null,
  walletType: null,
  walletLabel: '',
  ready: false,
  login: () => {},
  disconnect: async () => {},
};

export const UnifiedWalletContext = createContext<UnifiedWallet>(defaultWallet);

export function useUnifiedWallet(): UnifiedWallet {
  return useContext(UnifiedWalletContext);
}
