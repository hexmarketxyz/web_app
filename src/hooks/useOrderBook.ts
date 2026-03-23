'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMarketWebSocket } from '@/components/providers/WebSocketProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface PriceLevel {
  price: number;
  quantity: number;
}

interface OrderBook {
  outcomeId: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
  timestamp: string;
}

// WS book update from matching engine
interface WsBookSnapshot {
  bids: [number, number, number][];
  asks: [number, number, number][];
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
}

interface WsBookUpdate {
  outcome_id: string;
  yes: WsBookSnapshot;
  no: WsBookSnapshot;
}

export function useOrderBook(outcomeId: string) {
  const queryClient = useQueryClient();
  const ws = useMarketWebSocket();

  const query = useQuery<OrderBook>({
    queryKey: ['orderbook', outcomeId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/orderbook/${outcomeId}`);
      if (!res.ok) throw new Error('Failed to fetch order book');
      return res.json() as Promise<OrderBook>;
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!ws) return;

    const unsub = ws.subscribe([outcomeId], (event) => {
      if (event.event_type !== 'book' || event.asset_id !== outcomeId) return;

      const update = event as unknown as WsBookUpdate & { event_type: string; asset_id: string };
      const yesBook = update.yes;

      const orderbook: OrderBook = {
        outcomeId: update.outcome_id,
        bids: (yesBook.bids || []).map(([tick, qty]) => ({
          price: tick / 1000,
          quantity: qty,
        })),
        asks: (yesBook.asks || []).map(([tick, qty]) => ({
          price: tick / 1000,
          quantity: qty,
        })),
        timestamp: new Date().toISOString(),
      };

      queryClient.setQueryData(['orderbook', outcomeId], orderbook);
    });

    return unsub;
  }, [ws, outcomeId, queryClient]);

  return query;
}
