'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMarketWebSocket } from '@/components/providers/WebSocketProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface TradeItem {
  id: string;
  price: number;
  quantity: number;
  side: string;
  createdAt: string;
}

// REST response uses camelCase (TradeRow with #[serde(rename_all = "camelCase")])
interface RestTrade {
  id: string;
  price: number;
  quantity: number;
  side: string;
  createdAt: string;
}

// WS response uses snake_case (hex-types Trade struct, default serde)
interface WsTrade {
  id: string;
  price: string | number;
  quantity: number;
  side: string;
  timestamp: string;
}

const MAX_TRADES = 50;

export function useRecentTrades(outcomeId: string) {
  const queryClient = useQueryClient();
  const ws = useMarketWebSocket();

  const query = useQuery<TradeItem[]>({
    queryKey: ['recentTrades', outcomeId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/trades?outcome_id=${outcomeId}&limit=20`,
      );
      if (!res.ok) throw new Error('Failed to fetch trades');
      const trades: RestTrade[] = await res.json();
      return trades.map((t) => ({
        id: t.id,
        price: Number(t.price),
        quantity: t.quantity,
        side: t.side,
        createdAt: t.createdAt,
      }));
    },
  });

  useEffect(() => {
    if (!ws) return;

    const unsub = ws.subscribe([outcomeId], (event) => {
      if (event.event_type !== 'trade' || event.asset_id !== outcomeId) return;

      const wsTrade = event as unknown as WsTrade;
      const trade: TradeItem = {
        id: String(wsTrade.id),
        price: Number(wsTrade.price),
        quantity: wsTrade.quantity,
        side: wsTrade.side,
        createdAt: wsTrade.timestamp,
      };

      queryClient.setQueryData<TradeItem[]>(
        ['recentTrades', outcomeId],
        (old) => [trade, ...(old || [])].slice(0, MAX_TRADES),
      );
    });

    return unsub;
  }, [ws, outcomeId, queryClient]);

  return query;
}
