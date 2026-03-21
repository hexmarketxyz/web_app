'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { HexMarketWebSocket } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function deriveMarketWsUrl(apiUrl: string): string {
  const url = apiUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
  return `${url}/ws/market`;
}

const MarketWsContext = createContext<HexMarketWebSocket | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<HexMarketWebSocket | null>(null);
  const [, setReady] = useState(false);

  useEffect(() => {
    const ws = new HexMarketWebSocket(deriveMarketWsUrl(API_URL));
    wsRef.current = ws;
    ws.connect();
    setReady(true);
    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, []);

  return (
    <MarketWsContext.Provider value={wsRef.current}>
      {children}
    </MarketWsContext.Provider>
  );
}

export function useMarketWebSocket(): HexMarketWebSocket | null {
  return useContext(MarketWsContext);
}

/** @deprecated Use useMarketWebSocket instead */
export const useWebSocket = useMarketWebSocket;
