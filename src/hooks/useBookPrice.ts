'use client';

import { useMergedOrderBook } from './useMergedOrderBook';

/**
 * Returns the best ask price (decimal, e.g. 0.65) for an outcome from the merged orderbook.
 * The merged orderbook includes cross-outcome synthetic liquidity, so it reflects
 * both direct sell orders and opposing-side buy orders at complement prices.
 * Returns 0 if the orderbook is empty or not yet loaded.
 */
export function useBookBestAsk(outcomeId: string): number {
  const { data } = useMergedOrderBook(outcomeId);
  if (!data || data.asks.length === 0) return 0;
  return Number(data.asks[0].price);
}
