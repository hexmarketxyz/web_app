'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type ApiCredentials } from '@hexmarket/sdk';
import { useUnifiedWallet } from './useUnifiedWallet';
import { useAuth } from '@/components/providers/AuthTokenProvider';

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

export function useApiCredentials(): ApiCredentialsState {
  const { publicKeyBase58, connected } = useUnifiedWallet();
  const { authToken } = useAuth();
  const [credentials, setCredentials] = useState<ApiCredentials | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const currentPubkeyRef = useRef<string | null>(null);
  const creatingRef = useRef(false);

  const createCredentials = useCallback(async () => {
    if (!publicKeyBase58 || !authToken || creatingRef.current) return;

    creatingRef.current = true;
    setIsCreating(true);
    try {
      // Use the ensure endpoint — only needs auth token, no extra signature
      const res = await fetch(`${API_URL}/api/v1/auth/api-key/ensure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ nonce: DEFAULT_NONCE }),
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
  }, [publicKeyBase58, authToken]);

  // Load from localStorage or create on wallet connect / change
  useEffect(() => {
    if (!connected || !publicKeyBase58) return;

    // Already loaded for this wallet
    if (currentPubkeyRef.current === publicKeyBase58 && credentials) return;

    // Try localStorage first
    const stored = loadFromStorage(publicKeyBase58);
    if (stored) {
      setCredentials(stored);
      currentPubkeyRef.current = publicKeyBase58;
      return;
    }

    // Wait for auth token to be ready before creating
    if (!authToken) return;

    // Not in localStorage — create via API (no extra signature needed)
    createCredentials();
  }, [connected, publicKeyBase58, authToken, credentials, createCredentials]);

  // Clear on disconnect
  useEffect(() => {
    if (!connected) {
      setCredentials(null);
      currentPubkeyRef.current = null;
    }
  }, [connected]);

  return { credentials, isCreating };
}
