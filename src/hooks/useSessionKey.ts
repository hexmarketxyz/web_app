'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import { buildDelegationMessage, buildAuthToken } from '@hexmarket/sdk';
import { useUnifiedWallet } from './useUnifiedWallet';
import nacl from 'tweetnacl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const STORAGE_PREFIX = 'hex_session_key_';
/** Session key lifetime: 30 days in seconds. */
const SESSION_LIFETIME_SECS = 30 * 86400;

export interface SessionKeyState {
  /** Session key public key (base58), null if not yet created. */
  sessionPubkey: string | null;
  /** Sign a message using the session key (no wallet popup). */
  signWithSession: ((message: Uint8Array) => Promise<Uint8Array>) | null;
  /** True while the delegation is being signed and registered. */
  isCreating: boolean;
  /** True if a valid session key exists. */
  ready: boolean;
}

interface StoredSession {
  /** Base58-encoded secret key (64 bytes). */
  secretKey: string;
  /** Base58-encoded public key. */
  publicKey: string;
  /** Unix timestamp when session expires. */
  expiresAt: number;
}

function getStorageKey(pubkey: string): string {
  return `${STORAGE_PREFIX}${pubkey}`;
}

function loadSession(userPubkey: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(getStorageKey(userPubkey));
    if (!raw) return null;
    const parsed: StoredSession = JSON.parse(raw);
    // Check not expired (with 1h buffer)
    const now = Math.floor(Date.now() / 1000);
    if (now >= parsed.expiresAt - 3600) {
      localStorage.removeItem(getStorageKey(userPubkey));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(userPubkey: string, session: StoredSession): void {
  try {
    localStorage.setItem(getStorageKey(userPubkey), JSON.stringify(session));
  } catch {
    // storage full
  }
}

export function useSessionKey(): SessionKeyState {
  const { publicKeyBase58, signMessage, connected } = useUnifiedWallet();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const currentPubkeyRef = useRef<string | null>(null);
  const creatingRef = useRef(false);

  // Sign a message with the session key (no wallet popup)
  const signWithSession = useMemo(() => {
    if (!session) return null;
    return async (message: Uint8Array): Promise<Uint8Array> => {
      const secretKeyBytes = bs58.decode(session.secretKey);
      const signature = nacl.sign.detached(message, secretKeyBytes);
      return signature;
    };
  }, [session]);

  const createSession = useCallback(async () => {
    if (!publicKeyBase58 || !signMessage || creatingRef.current) return;

    creatingRef.current = true;
    setIsCreating(true);
    try {
      // 1. Generate a new Ed25519 keypair
      const keypair = Keypair.generate();
      const sessionPubkey = keypair.publicKey.toBase58();
      const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECS;

      // 2. Build delegation message and sign with wallet (1 signature popup)
      const delegationMsg = buildDelegationMessage(sessionPubkey, expiresAt);
      const delegationSigBytes = await signMessage(delegationMsg);
      const delegationSig = bs58.encode(delegationSigBytes);

      // 3. Build auth token with wallet for the registration call
      const authToken = await buildAuthToken(publicKeyBase58, signMessage);

      // 4. Register session key on server
      const res = await fetch(`${API_URL}/api/v1/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          session_pubkey: sessionPubkey,
          delegation_signature: delegationSig,
          expires_at: expiresAt,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Failed to register session key: ${text}`);
      }

      // 5. Store session keypair locally
      const stored: StoredSession = {
        secretKey: bs58.encode(keypair.secretKey),
        publicKey: sessionPubkey,
        expiresAt,
      };
      saveSession(publicKeyBase58, stored);
      setSession(stored);
      currentPubkeyRef.current = publicKeyBase58;
    } catch (err) {
      console.error('Failed to create session key:', err);
    } finally {
      setIsCreating(false);
      creatingRef.current = false;
    }
  }, [publicKeyBase58, signMessage]);

  // Load or create session on connect
  useEffect(() => {
    if (!connected || !publicKeyBase58 || !signMessage) return;
    if (currentPubkeyRef.current === publicKeyBase58 && session) return;

    // Try loading from localStorage
    const stored = loadSession(publicKeyBase58);
    if (stored) {
      setSession(stored);
      currentPubkeyRef.current = publicKeyBase58;
      return;
    }

    // No session key — create one
    createSession();
  }, [connected, publicKeyBase58, signMessage, session, createSession]);

  // Clear on disconnect
  useEffect(() => {
    if (!connected) {
      setSession(null);
      currentPubkeyRef.current = null;
    }
  }, [connected]);

  return {
    sessionPubkey: session?.publicKey ?? null,
    signWithSession,
    isCreating,
    ready: !!session && !!signWithSession,
  };
}
