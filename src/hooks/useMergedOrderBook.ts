'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMarketWebSocket } from '@/components/providers/WebSocketProvider';
import type { LiquiditySource } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface MergedPriceLevel {
  price: number;
  quantity: number;
  source: LiquiditySource;
}

interface MergedOrderBook {
  outcomeId: string;
  bids: MergedPriceLevel[];
  asks: MergedPriceLevel[];
}

// WS merged book update — both bids and asks now carry source
interface WsMergedSnapshot {
  bids: [number, number, string][];
  asks: [number, number, string][];
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
}

interface WsMergedBookUpdate {
  outcome_id: string;
  merged: WsMergedSnapshot;
}

function parseLevel([tick, qty, source]: [number, number, string]): MergedPriceLevel {
  return {
    price: tick / 1000,
    quantity: qty,
    source: (source as LiquiditySource) || 'direct',
  };
}

export function useMergedOrderBook(outcomeId: string) {
  const queryClient = useQueryClient();
  const ws = useMarketWebSocket();

  const query = useQuery<MergedOrderBook>({
    queryKey: ['mergedOrderbook', outcomeId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/orderbook/${outcomeId}/merged`);
      if (!res.ok) throw new Error('Failed to fetch merged order book');
      return res.json() as Promise<MergedOrderBook>;
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!ws) return;

    const unsub = ws.subscribe([outcomeId], (event) => {
      if (event.event_type !== 'merged_book' || event.asset_id !== outcomeId) return;

      const update = event as unknown as WsMergedBookUpdate & { event_type: string; asset_id: string };
      const merged = update.merged;

      const mergedBook: MergedOrderBook = {
        outcomeId: update.outcome_id,
        bids: (merged.bids || []).map(parseLevel),
        asks: (merged.asks || []).map(parseLevel),
      };

      queryClient.setQueryData(['mergedOrderbook', outcomeId], mergedBook);
    });

    return unsub;
  }, [ws, outcomeId, queryClient]);

  return query;
}
