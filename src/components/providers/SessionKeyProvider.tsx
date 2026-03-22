'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSessionKey, type SessionKeyState } from '@/hooks/useSessionKey';

const SessionKeyContext = createContext<SessionKeyState>({
  sessionPubkey: null,
  signWithSession: null,
  isCreating: false,
  ready: false,
});

export function SessionKeyProvider({ children }: { children: ReactNode }) {
  const state = useSessionKey();
  return (
    <SessionKeyContext.Provider value={state}>
      {children}
    </SessionKeyContext.Provider>
  );
}

export function useSession(): SessionKeyState {
  return useContext(SessionKeyContext);
}
