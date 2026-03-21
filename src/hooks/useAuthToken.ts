'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildAuthToken } from '@hexmarket/sdk';
import { useUnifiedWallet } from './useUnifiedWallet';

/** Refresh 5 minutes before 24h expiry. */
const REFRESH_BUFFER_SECS = 5 * 60;
/** Token lifetime (must match server DEFAULT_TOKEN_EXPIRY_SECS). */
const TOKEN_LIFETIME_SECS = 86400;

export interface AuthTokenState {
  authToken: string | null;
  isSigningToken: boolean;
  refreshToken: () => Promise<void>;
}

export function useAuthToken(): AuthTokenState {
  const { publicKeyBase58, signMessage, connected } = useUnifiedWallet();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isSigningToken, setIsSigningToken] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentPubkeyRef = useRef<string | null>(null);

  const doSign = useCallback(async () => {
    if (!publicKeyBase58 || !signMessage) return;

    setIsSigningToken(true);
    try {
      const token = await buildAuthToken(publicKeyBase58, signMessage);
      setAuthToken(token);
      currentPubkeyRef.current = publicKeyBase58;

      // Schedule auto-refresh
      const refreshInMs = (TOKEN_LIFETIME_SECS - REFRESH_BUFFER_SECS) * 1000;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        doSign();
      }, refreshInMs);
    } catch (err) {
      console.error('Failed to sign auth token:', err);
      setAuthToken(null);
    } finally {
      setIsSigningToken(false);
    }
  }, [publicKeyBase58, signMessage]);

  // Sign on connect or wallet change
  useEffect(() => {
    if (connected && publicKeyBase58 && signMessage) {
      // Only re-sign if wallet changed or no token
      if (currentPubkeyRef.current !== publicKeyBase58 || !authToken) {
        doSign();
      }
    }
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
