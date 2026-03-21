'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@solana/web3.js';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useApiCreds } from '@/components/providers/ApiCredentialsProvider';
import { buildL2Headers, type ApiCredentials } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// ---------------------------------------------------------------------------
// Vault balance query
// ---------------------------------------------------------------------------

export interface VaultBalance {
  user: string;
  vaultPubkey: string;
  usdcBalance: number;
}

export function useVaultBalance() {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { credentials } = useApiCreds();

  return useQuery<VaultBalance>({
    queryKey: ['vaultBalance', publicKeyBase58],
    queryFn: async () => {
      const path = `/api/v1/vault/balance?user=${publicKeyBase58}`;
      const l2Headers = await buildL2Headers(credentials!, publicKeyBase58!, 'GET', path);

      const res = await fetch(`${API_URL}${path}`, { headers: l2Headers });
      if (!res.ok) throw new Error('Failed to fetch vault balance');
      return res.json();
    },
    enabled: !!publicKeyBase58 && !!credentials,
  });
}

// ---------------------------------------------------------------------------
// Shared: sign + submit flow
// ---------------------------------------------------------------------------

async function signAndSubmit(
  txBase64: string,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  credentials: ApiCredentials,
  publicKeyBase58: string,
): Promise<string> {
  // Deserialize the partially-signed transaction
  const txBytes = Buffer.from(txBase64, 'base64');
  const tx = Transaction.from(txBytes);

  // User signs the transaction
  const signedTx = await signTransaction(tx);

  // Re-serialize the fully-signed transaction
  const signedBytes = signedTx.serialize();
  const signedBase64 = Buffer.from(signedBytes).toString('base64');

  // Build L2 headers for submit
  const body = JSON.stringify({ transaction: signedBase64 });
  const path = '/api/v1/vault/submit';
  const l2Headers = await buildL2Headers(credentials, publicKeyBase58, 'POST', path);

  // Submit to the API
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...l2Headers,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Transaction failed: ${text}`);
  }

  const { signature } = await res.json();
  return signature;
}

// ---------------------------------------------------------------------------
// Create vault mutation
// ---------------------------------------------------------------------------

export function useCreateVault() {
  const { publicKeyBase58, signTransaction } = useUnifiedWallet();
  const { credentials } = useApiCreds();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!publicKeyBase58 || !signTransaction || !credentials) {
        throw new Error('Wallet not connected or API credentials not ready');
      }

      const path = '/api/v1/vault/create';
      const l2Headers = await buildL2Headers(credentials, publicKeyBase58, 'POST', path);

      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...l2Headers,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Failed to create vault: ${text}`);
      }

      const { transaction } = await res.json();
      return signAndSubmit(transaction, signTransaction, credentials, publicKeyBase58);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultBalance', publicKeyBase58] });
    },
  });
}

// ---------------------------------------------------------------------------
// Deposit mutation
// ---------------------------------------------------------------------------

export function useDeposit() {
  const { publicKeyBase58, signTransaction } = useUnifiedWallet();
  const { credentials } = useApiCreds();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!publicKeyBase58 || !signTransaction || !credentials) {
        throw new Error('Wallet not connected or API credentials not ready');
      }

      const body = JSON.stringify({ amount });
      const path = '/api/v1/vault/deposit';
      const l2Headers = await buildL2Headers(credentials, publicKeyBase58, 'POST', path);

      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...l2Headers,
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Failed to build deposit tx: ${text}`);
      }

      const { transaction } = await res.json();
      return signAndSubmit(transaction, signTransaction, credentials, publicKeyBase58);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultBalance', publicKeyBase58] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance', publicKeyBase58] });
    },
  });
}

// ---------------------------------------------------------------------------
// Withdraw mutation
// ---------------------------------------------------------------------------

export function useWithdraw() {
  const { publicKeyBase58, signTransaction } = useUnifiedWallet();
  const { credentials } = useApiCreds();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!publicKeyBase58 || !signTransaction || !credentials) {
        throw new Error('Wallet not connected or API credentials not ready');
      }

      const body = JSON.stringify({ amount });
      const path = '/api/v1/vault/withdraw';
      const l2Headers = await buildL2Headers(credentials, publicKeyBase58, 'POST', path);

      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...l2Headers,
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Failed to build withdraw tx: ${text}`);
      }

      const { transaction } = await res.json();
      return signAndSubmit(transaction, signTransaction, credentials, publicKeyBase58);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultBalance', publicKeyBase58] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance', publicKeyBase58] });
    },
  });
}
