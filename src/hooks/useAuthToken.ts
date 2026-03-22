'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildAuthToken, parseAuthTokenTimestamp } from '@hexmarket/sdk';
import { useUnifiedWallet } from './useUnifiedWallet';

/** Token lifetime — must match server DEFAULT_TOKEN_EXPIRY_SECS (7 days). */
const TOKEN_LIFETIME_SECS = 7 * 86400;
/** Refresh 1 hour before expiry. */
const REFRESH_BUFFER_SECS = 3600;

const AUTH_TOKEN_PREFIX = 'hex_auth_token_';

export interface AuthTokenState {
  authToken: string | null;
  isSigningToken: boolean;
  refreshToken: () => Promise<void>;
}

function getStorageKey(pubkey: string): string {
  return `${AUTH_TOKEN_PREFIX}${pubkey}`;
}

/** Load a cached auth token if it's still valid (not expired). */
function loadCachedToken(pubkey: string): string | null {
  try {
    const raw = localStorage.getItem(getStorageKey(pubkey));
    if (!raw) return null;
    const ts = parseAuthTokenTimestamp(raw);
    if (ts == null) return null;
    const now = Math.floor(Date.now() / 1000);
    const age = now - ts;
    // Still valid if within lifetime minus buffer
    if (age >= 0 && age < TOKEN_LIFETIME_SECS - REFRESH_BUFFER_SECS) {
      return raw;
    }
    // Expired — remove
    localStorage.removeItem(getStorageKey(pubkey));
    return null;
  } catch {
    return null;
  }
}

function saveCachedToken(pubkey: string, token: string): void {
  try {
    localStorage.setItem(getStorageKey(pubkey), token);
  } catch {
    // storage full or unavailable
  }
}

function clearCachedToken(pubkey: string): void {
  try {
    localStorage.removeItem(getStorageKey(pubkey));
  } catch {
    // ignore
  }
}

export function useAuthToken(): AuthTokenState {
  const { publicKeyBase58, signMessage, connected } = useUnifiedWallet();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isSigningToken, setIsSigningToken] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentPubkeyRef = useRef<string | null>(null);
  const signingRef = useRef(false);

  const scheduleRefresh = useCallback((token: string, doSign: () => void) => {
    const ts = parseAuthTokenTimestamp(token);
    if (ts == null) return;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = ts + TOKEN_LIFETIME_SECS - REFRESH_BUFFER_SECS;
    const refreshInMs = Math.max((expiresAt - now) * 1000, 0);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(doSign, refreshInMs);
  }, []);

  const doSign = useCallback(async () => {
    if (!publicKeyBase58 || !signMessage || signingRef.current) return;

    signingRef.current = true;
    setIsSigningToken(true);
    try {
      const token = await buildAuthToken(publicKeyBase58, signMessage);
      saveCachedToken(publicKeyBase58, token);
      setAuthToken(token);
      currentPubkeyRef.current = publicKeyBase58;

      // Schedule auto-refresh before expiry
      scheduleRefresh(token, () => doSign());
    } catch (err) {
      console.error('Failed to sign auth token:', err);
      setAuthToken(null);
    } finally {
      setIsSigningToken(false);
      signingRef.current = false;
    }
  }, [publicKeyBase58, signMessage, scheduleRefresh]);

  // Load from cache or sign on connect / wallet change
  useEffect(() => {
    if (!connected || !publicKeyBase58 || !signMessage) return;

    // Already loaded for this wallet
    if (currentPubkeyRef.current === publicKeyBase58 && authToken) return;

    // Try cached token first
    const cached = loadCachedToken(publicKeyBase58);
    if (cached) {
      setAuthToken(cached);
      currentPubkeyRef.current = publicKeyBase58;
      scheduleRefresh(cached, () => doSign());
      return;
    }

    // No cache — sign fresh
    doSign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKeyBase58, signMessage]);

  // Clear on disconnect
  useEffect(() => {
    if (!connected) {
      setAuthToken(null);
      currentPubkeyRef.current = null;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    }
  }, [connected]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return { authToken, isSigningToken, refreshToken: doSign };
}
