'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildAuthToken, buildSessionAuthToken, parseAuthTokenTimestamp } from '@hexmarket/sdk';
import { useUnifiedWallet } from './useUnifiedWallet';
import { useSession } from '@/components/providers/SessionKeyProvider';

/** Token lifetime — must match server DEFAULT_TOKEN_EXPIRY_SECS (30 days). */
const TOKEN_LIFETIME_SECS = 30 * 86400;
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
    if (age >= 0 && age < TOKEN_LIFETIME_SECS - REFRESH_BUFFER_SECS) {
      return raw;
    }
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

export function useAuthToken(): AuthTokenState {
  const { publicKeyBase58, signMessage, connected } = useUnifiedWallet();
  const { sessionPubkey, signWithSession, ready: sessionReady } = useSession();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isSigningToken, setIsSigningToken] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentPubkeyRef = useRef<string | null>(null);
  const signingRef = useRef(false);

  const scheduleRefresh = useCallback((token: string, refreshFn: () => void) => {
    const ts = parseAuthTokenTimestamp(token);
    if (ts == null) return;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = ts + TOKEN_LIFETIME_SECS - REFRESH_BUFFER_SECS;
    const refreshInMs = Math.max((expiresAt - now) * 1000, 0);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(refreshFn, refreshInMs);
  }, []);

  const doSign = useCallback(async () => {
    if (!publicKeyBase58 || signingRef.current) return;

    // Prefer session key (no wallet popup). Fall back to wallet signMessage.
    const canUseSession = sessionPubkey && signWithSession;
    if (!canUseSession && !signMessage) return;

    signingRef.current = true;
    setIsSigningToken(true);
    try {
      let token: string;
      if (canUseSession) {
        // Sign with session key — no popup
        token = await buildSessionAuthToken(publicKeyBase58, sessionPubkey!, signWithSession!);
      } else {
        // Fall back to wallet — popup
        token = await buildAuthToken(publicKeyBase58, signMessage!);
      }

      saveCachedToken(publicKeyBase58, token);
      setAuthToken(token);
      currentPubkeyRef.current = publicKeyBase58;
      scheduleRefresh(token, () => doSign());
    } catch (err) {
      console.error('Failed to sign auth token:', err);
      setAuthToken(null);
    } finally {
      setIsSigningToken(false);
      signingRef.current = false;
    }
  }, [publicKeyBase58, signMessage, sessionPubkey, signWithSession, scheduleRefresh]);

  // Load from cache or sign on connect / wallet change
  useEffect(() => {
    if (!connected || !publicKeyBase58) return;
    // Need either session key or wallet signMessage
    if (!signMessage && !signWithSession) return;

    if (currentPubkeyRef.current === publicKeyBase58 && authToken) return;

    // Try cached token first
    const cached = loadCachedToken(publicKeyBase58);
    if (cached) {
      setAuthToken(cached);
      currentPubkeyRef.current = publicKeyBase58;
      scheduleRefresh(cached, () => doSign());
      return;
    }

    // Wait for session key to be ready before signing (avoids wallet popup)
    if (!sessionReady && signMessage) {
      // Session key still loading — wait a tick, it might be ready soon
      // If session key becomes ready, this effect re-runs
      return;
    }

    doSign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKeyBase58, signMessage, signWithSession, sessionReady]);

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
