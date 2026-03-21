'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useOrderBook } from '@/hooks/useOrderBook';
import { useMergedOrderBook } from '@/hooks/useMergedOrderBook';
import { useMemo } from 'react';
import type { LiquiditySource } from '@hexmarket/sdk';

interface DisplayLevel {
  price: number;
  quantity: number;
  total: number;
  source?: LiquiditySource;
}

interface OrderBookDisplayProps {
  outcomeId: string;
  merged?: boolean;
}

export function OrderBookDisplay({ outcomeId, merged = false }: OrderBookDisplayProps) {
  const { t } = useTranslation();
  const directQuery = useOrderBook(outcomeId);
  const mergedQuery = useMergedOrderBook(outcomeId);

  const data = merged ? mergedQuery.data : directQuery.data;

  const bids: DisplayLevel[] = useMemo(() => {
    if (!data?.bids) return [];
    let cumulative = 0;
    return data.bids.map((b) => {
      cumulative += b.quantity;
      return {
        price: b.price,
        quantity: b.quantity,
        total: cumulative,
        source: 'source' in b ? (b as { source: LiquiditySource }).source : undefined,
      };
    });
  }, [data?.bids]);

  const asks: DisplayLevel[] = useMemo(() => {
    if (!data?.asks) return [];
    let cumulative = 0;
    return data.asks.map((a) => {
      cumulative += a.quantity;
      return {
        price: a.price,
        quantity: a.quantity,
        total: cumulative,
        source: 'source' in a ? (a as { source: LiquiditySource }).source : undefined,
      };
    });
  }, [data?.asks]);

  const spread =
    asks.length > 0 && bids.length > 0
      ? asks[0].price - bids[0].price
      : null;

  const askColor = (source?: LiquiditySource) => {
    if (!merged || !source) return 'text-green-500';
    switch (source) {
      case 'cross_outcome':
        return 'text-purple-400';
      case 'mixed':
        return 'text-orange-400';
      default:
        return 'text-green-500';
    }
  };

  const bidColor = (source?: LiquiditySource) => {
    if (!merged || !source) return 'text-hex-green';
    switch (source) {
      case 'cross_outcome':
        return 'text-purple-400';
      case 'mixed':
        return 'text-orange-400';
      default:
        return 'text-hex-green';
    }
  };

  return (
    <div className="space-y-2">
      {/* Asks (sells) - reverse to show highest first */}
      <div className="space-y-1">
        {asks
          .slice(0, 10)
          .reverse()
          .map((level, i) => (
            <div
              key={`ask-${i}`}
              className="flex justify-between text-sm font-mono"
            >
              <span className={askColor(level.source)}>
                {(level.price * 100).toFixed(0)}¢
              </span>
              <span className="text-theme-secondary">{level.quantity}</span>
              <span className="text-theme-tertiary">{level.total}</span>
            </div>
          ))}
      </div>

      {/* Spread */}
      <div className="text-center text-xs text-theme-tertiary py-1 border-y border-hex-border">
        {t('orderBook.spread')} {spread != null ? `${(spread * 100).toFixed(0)}¢` : '-'}
      </div>

      {/* Bids (buys) */}
      <div className="space-y-1">
        {bids.slice(0, 10).map((level, i) => (
          <div
            key={`bid-${i}`}
            className="flex justify-between text-sm font-mono"
          >
            <span className={bidColor(level.source)}>
              {(level.price * 100).toFixed(0)}¢
            </span>
            <span className="text-theme-secondary">{level.quantity}</span>
            <span className="text-theme-tertiary">{level.total}</span>
          </div>
        ))}
      </div>

      {bids.length === 0 && asks.length === 0 && (
        <div className="text-center text-theme-tertiary text-sm py-4">
          {t('orderBook.noOrders')}
        </div>
      )}
    </div>
  );
}
