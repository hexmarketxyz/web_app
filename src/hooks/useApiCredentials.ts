'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildApiKeyMessage, buildAuthToken, type ApiCredentials } from '@hexmarket/sdk';
import { useUnifiedWallet } from './useUnifiedWallet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const STORAGE_PREFIX = 'hex_api_credentials_';
const DEFAULT_NONCE = 0;

export interface ApiCredentialsState {
  credentials: ApiCredentials | null;
  isCreating: boolean;
}

function getStorageKey(pubkey: string): string {
  return `${STORAGE_PREFIX}${pubkey}`;
}

function loadFromStorage(pubkey: string): ApiCredentials | null {
  try {
    const raw = localStorage.getItem(getStorageKey(pubkey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.apiKey && parsed.secret && parsed.passphrase) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(pubkey: string, creds: ApiCredentials): void {
  localStorage.setItem(getStorageKey(pubkey), JSON.stringify(creds));
}

function clearStorage(pubkey: string): void {
  localStorage.removeItem(getStorageKey(pubkey));
}

export function useApiCredentials(): ApiCredentialsState {
  const { publicKeyBase58, signMessage, connected } = useUnifiedWallet();
  const [credentials, setCredentials] = useState<ApiCredentials | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const currentPubkeyRef = useRef<string | null>(null);
  const creatingRef = useRef(false);

  const createCredentials = useCallback(async () => {
    if (!publicKeyBase58 || !signMessage || creatingRef.current) return;

    creatingRef.current = true;
    setIsCreating(true);
    try {
      // 1. Build L1 auth token for the /auth/api-key endpoint
      const authToken = await buildAuthToken(publicKeyBase58, signMessage);

      // 2. Sign the API key derivation message
      const derivationMsg = buildApiKeyMessage(DEFAULT_NONCE);
      const sigBytes = await signMessage(derivationMsg);
      // Encode signature as base58
      const { encode } = await import('bs58');
      const derivationSig = encode(sigBytes);

      // 3. Call POST /api/v1/auth/api-key
      const res = await fetch(`${API_URL}/api/v1/auth/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          nonce: DEFAULT_NONCE,
          signature: derivationSig,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Failed to create API key: ${text}`);
      }

      const data = await res.json();
      const creds: ApiCredentials = {
        apiKey: data.apiKey,
        secret: data.secret,
        passphrase: data.passphrase,
      };

      saveToStorage(publicKeyBase58, creds);
      setCredentials(creds);
      currentPubkeyRef.current = publicKeyBase58;
    } catch (err) {
      console.error('Failed to create API credentials:', err);
      setCredentials(null);
    } finally {
      setIsCreating(false);
      creatingRef.current = false;
    }
  }, [publicKeyBase58, signMessage]);

  // Load from localStorage or create on wallet connect / change
  useEffect(() => {
    if (!connected || !publicKeyBase58 || !signMessage) return;

    // Already loaded for this wallet
    if (currentPubkeyRef.current === publicKeyBase58 && credentials) return;

    // Try localStorage first
    const stored = loadFromStorage(publicKeyBase58);
    if (stored) {
      setCredentials(stored);
      currentPubkeyRef.current = publicKeyBase58;
      return;
    }

    // Not in localStorage — create via API
    createCredentials();
  }, [connected, publicKeyBase58, signMessage, credentials, createCredentials]);

  // Clear on disconnect
  useEffect(() => {
    if (!connected) {
      setCredentials(null);
      currentPubkeyRef.current = null;
    }
  }, [connected]);

  return { credentials, isCreating };
}
