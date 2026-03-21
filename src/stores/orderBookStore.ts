import { create } from 'zustand';

interface PriceLevel {
  price: number;
  quantity: number;
  total: number;
}

interface OrderBookState {
  outcomeId: string | null;
  bids: PriceLevel[];
  asks: PriceLevel[];
  spread: number | null;
  lastUpdate: number;
  setOutcome: (outcomeId: string) => void;
  applySnapshot: (bids: PriceLevel[], asks: PriceLevel[]) => void;
}

export const useOrderBookStore = create<OrderBookState>((set) => ({
  outcomeId: null,
  bids: [],
  asks: [],
  spread: null,
  lastUpdate: 0,

  setOutcome: (outcomeId) => set({ outcomeId, bids: [], asks: [], spread: null }),

  applySnapshot: (bids, asks) => {
    // Compute cumulative totals
    let bidTotal = 0;
    const bidsWithTotal = bids.map((b) => {
      bidTotal += b.quantity;
      return { ...b, total: bidTotal };
    });

    let askTotal = 0;
    const asksWithTotal = asks.map((a) => {
      askTotal += a.quantity;
      return { ...a, total: askTotal };
    });

    const spread =
      asksWithTotal.length > 0 && bidsWithTotal.length > 0
        ? asksWithTotal[0].price - bidsWithTotal[0].price
        : null;

    set({
      bids: bidsWithTotal,
      asks: asksWithTotal,
      spread,
      lastUpdate: Date.now(),
    });
  },
}));
