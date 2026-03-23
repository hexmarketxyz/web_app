'use client';

import { useOrderBook } from './useOrderBook';

/**
 * Returns the best ask price (decimal, e.g. 0.65) for an outcome from the orderbook.
 * Returns 0 if the orderbook is empty or not yet loaded.
 */
export function useBookBestAsk(outcomeId: string): number {
  const { data } = useOrderBook(outcomeId);
  if (!data || data.asks.length === 0) return 0;
  return data.asks[0].price;
}
