'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuthToken, type AuthTokenState } from '@/hooks/useAuthToken';

const AuthTokenContext = createContext<AuthTokenState>({
  authToken: null,
  isSigningToken: false,
  refreshToken: async () => {},
});

export function AuthTokenProvider({ children }: { children: ReactNode }) {
  const auth = useAuthToken();
  return (
    <AuthTokenContext.Provider value={auth}>
      {children}
    </AuthTokenContext.Provider>
  );
}

export function useAuth(): AuthTokenState {
  return useContext(AuthTokenContext);
}
