'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useApiCredentials, type ApiCredentialsState } from '@/hooks/useApiCredentials';

const ApiCredentialsContext = createContext<ApiCredentialsState>({
  credentials: null,
  isCreating: false,
});

export function ApiCredentialsProvider({ children }: { children: ReactNode }) {
  const state = useApiCredentials();
  return (
    <ApiCredentialsContext.Provider value={state}>
      {children}
    </ApiCredentialsContext.Provider>
  );
}

export function useApiCreds(): ApiCredentialsState {
  return useContext(ApiCredentialsContext);
}
