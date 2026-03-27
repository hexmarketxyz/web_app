'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMergedOrderBook } from '@/hooks/useMergedOrderBook';
import { usePortfolioPositions } from '@/hooks/usePortfolioPositions';
import { useAllOpenOrders } from '@/hooks/useAllOpenOrders';
import { useUserTrades } from '@/hooks/useUserTrades';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { PriceChart } from '@/components/charts/PriceChart';
import { EventPositionsSection } from '@/components/events/EventPositionsSection';
import { EventOpenOrdersSection } from '@/components/events/EventOpenOrdersSection';
import { EventHistorySection } from '@/components/events/EventHistorySection';
import type { Outcome, LiquiditySource } from '@hexmarket/sdk';

type Tab = 'positions' | 'orders' | 'orderbook' | 'graph' | 'history';

interface MarketDetailPanelProps {
  outcomes: Outcome[];
  selectedOutcomeId?: string;
  onSelectOutcome: (id: string) => void;
  onSell?: (outcomeId: string, quantity: number) => void;
  /** If true, hide orderbook tab (market is resolved) */
  isResolved?: boolean;
}

interface DisplayLevel {
  price: number;
  quantity: number;
  total: number;
  cumQty: number;
  source?: LiquiditySource;
}

function askPriceColor(): string {
  return 'text-red-600';
}

function bidPriceColor(): string {
  return 'text-green-600';
}

export function MarketDetailPanel({
  outcomes,
  selectedOutcomeId,
  onSelectOutcome,
  onSell,
  isResolved,
}: MarketDetailPanelProps) {
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const spreadRef = useRef<HTMLDivElement>(null);
  const { data: positionsData } = usePortfolioPositions();
  const { data: allOrdersData } = useAllOpenOrders();
  const { data: tradesData } = useUserTrades();

  const outcomeIds = useMemo(() => new Set(outcomes.map((o) => o.id)), [outcomes]);
  const hasPositions = (positionsData ?? []).some(
    (p) => outcomeIds.has(p.outcomeId) && p.quantity > 0,
  );
  const hasOrders = (allOrdersData ?? []).some((o) => outcomeIds.has(o.outcomeId));
  const hasTrades = (tradesData ?? []).some((trade) => outcomeIds.has(trade.outcomeId));

  const availableTabs = useMemo(() => {
    const tabs: { key: Tab; label: string }[] = [];
    if (hasPositions) tabs.push({ key: 'positions', label: t('portfolio.positions') });
    if (hasOrders) tabs.push({ key: 'orders', label: t('portfolio.openOrders') });
    if (!isResolved) tabs.push({ key: 'orderbook', label: t('orderBook.title') });
    tabs.push({ key: 'graph', label: t('orderBook.graph') });
    if (hasTrades) tabs.push({ key: 'history', label: t('portfolio.history') });
    return tabs;
  }, [hasPositions, hasOrders, hasTrades, isResolved, t]);

  const [tab, setTab] = useState<Tab>(isResolved ? 'graph' : 'orderbook');
  const [viewOutcomeId, setViewOutcomeId] = useState(
    () => selectedOutcomeId || outcomes[0]?.id || '',
  );

  // Sync with parent's selectedOutcomeId when it changes
  useEffect(() => {
    if (selectedOutcomeId && outcomes.some((o) => o.id === selectedOutcomeId)) {
      setViewOutcomeId(selectedOutcomeId);
    }
  }, [selectedOutcomeId, outcomes]);

  const viewOutcome = outcomes.find((o) => o.id === viewOutcomeId) || outcomes[0];
  const { data: orderbook } = useMergedOrderBook(viewOutcomeId);

  const asks: DisplayLevel[] = useMemo(() => {
    if (!orderbook?.asks) return [];
    let cumTotal = 0;
    let cumQty = 0;
    return orderbook.asks.map((a) => {
      cumTotal += a.price * a.quantity;
      cumQty += a.quantity;
      return { price: a.price, quantity: a.quantity, total: cumTotal, cumQty, source: a.source };
    });
  }, [orderbook?.asks]);

  const bids: DisplayLevel[] = useMemo(() => {
    if (!orderbook?.bids) return [];
    let cumTotal = 0;
    let cumQty = 0;
    return orderbook.bids.map((b) => {
      cumTotal += b.price * b.quantity;
      cumQty += b.quantity;
      return { price: b.price, quantity: b.quantity, total: cumTotal, cumQty, source: b.source };
    });
  }, [orderbook?.bids]);

  const visibleAsks = asks.slice(0, 10);
  const visibleBids = bids.slice(0, 10);
  const maxCumQty = Math.max(
    visibleAsks.length > 0 ? visibleAsks[visibleAsks.length - 1].cumQty : 0,
    visibleBids.length > 0 ? visibleBids[visibleBids.length - 1].cumQty : 0,
    1,
  );

  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const lastPrice = bestBid;

  const cycleOutcome = () => {
    const idx = outcomes.findIndex((o) => o.id === viewOutcomeId);
    const next = outcomes[(idx + 1) % outcomes.length];
    setViewOutcomeId(next.id);
    onSelectOutcome(next.id);
  };

  const handleRecenter = () => {
    spreadRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['mergedOrderbook', viewOutcomeId] });
  };

  return (
    <div className="px-5 pb-4 pt-2">
      {/* Tabs + action buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-4">
          {availableTabs.map((t_) => (
            <button
              key={t_.key}
              type="button"
              onClick={() => setTab(t_.key)}
              className={`text-sm font-medium pb-1 border-b-2 transition ${
                tab === t_.key
                  ? 'text-theme-primary border-hex-blue'
                  : 'text-theme-tertiary border-transparent hover:text-theme-secondary'
              }`}
            >
              {t_.label}
            </button>
          ))}
        </div>

        {tab === 'orderbook' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecenter}
              className="text-theme-tertiary hover:text-theme-primary transition p-1"
              title={t('orderBook.recenter')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-theme-tertiary hover:text-theme-primary transition p-1"
              title={t('orderBook.refresh')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {tab === 'positions' ? (
        <EventPositionsSection outcomes={outcomes} bare onSell={onSell} />
      ) : tab === 'orders' ? (
        <EventOpenOrdersSection outcomes={outcomes} bare />
      ) : tab === 'history' ? (
        <EventHistorySection outcomes={outcomes} bare />
      ) : tab === 'orderbook' ? (
        <div>
          {/* Outcome toggle */}
          <button
            type="button"
            onClick={cycleOutcome}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-theme-secondary mb-3 hover:text-theme-primary transition"
          >
            {t('orderBook.tradeLabel')} {viewOutcome ? translateDynamic(viewOutcome.label, viewOutcome.labelTranslations, locale) : ''}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Column headers */}
          <div className="flex text-[10px] uppercase tracking-wider text-theme-tertiary font-medium mb-1 px-1">
            <span className="w-20" />
            <span className="flex-1 text-right">{t('orderBook.price')}</span>
            <span className="flex-1 text-right">{t('orderBook.shares')}</span>
            <span className="flex-1 text-right">{t('orderBook.total')}</span>
          </div>

          {/* Orderbook body */}
          <div className="max-h-[320px] overflow-y-auto">
            {/* Asks (reversed: highest first) */}
            <div>
              {visibleAsks
                .slice()
                .reverse()
                .map((level, i, arr) => {
                  const depthPct = (level.cumQty / maxCumQty) * 100;
                  return (
                    <div
                      key={`ask-${i}`}
                      className="flex items-center text-sm font-mono h-7 px-1"
                    >
                      <div className="relative w-20 h-full flex-shrink-0">
                        <div
                          className="absolute inset-y-0 left-0 bg-red-500/15"
                          style={{ width: `${depthPct}%` }}
                        />
                        {i === arr.length - 1 && (
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 z-10 text-white bg-red-600 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold">
                            {t('orderBook.asks')}
                          </span>
                        )}
                      </div>
                      <span className={`flex-1 text-right ${askPriceColor()}`}>
                        {(level.price * 100).toFixed(1)}¢
                      </span>
                      <span className="flex-1 text-right text-theme-secondary">
                        {level.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="flex-1 text-right text-theme-tertiary">
                        ${level.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Spread divider */}
            <div
              ref={spreadRef}
              className="flex items-center justify-between text-xs text-theme-tertiary py-2 px-1 my-1 border-y border-hex-border"
            >
              <span>
                {t('orderBook.last')} {lastPrice != null ? `${(lastPrice * 100).toFixed(1)}¢` : '—'}
              </span>
              <span>
                {t('orderBook.spread')} {spread != null ? `${(spread * 100).toFixed(1)}¢` : '—'}
              </span>
            </div>

            {/* Bids */}
            <div>
              {visibleBids.map((level, i) => {
                const depthPct = (level.cumQty / maxCumQty) * 100;
                return (
                  <div
                    key={`bid-${i}`}
                    className="flex items-center text-sm font-mono h-7 px-1"
                  >
                    <div className="relative w-20 h-full flex-shrink-0">
                      <div
                        className="absolute inset-y-0 left-0 bg-green-500/15"
                        style={{ width: `${depthPct}%` }}
                      />
                      {i === 0 && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 z-10 text-white bg-green-600 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold">
                          {t('orderBook.bids')}
                        </span>
                      )}
                    </div>
                    <span className={`flex-1 text-right ${bidPriceColor()}`}>
                      {(level.price * 100).toFixed(1)}¢
                    </span>
                    <span className="flex-1 text-right text-theme-secondary">
                      {level.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="flex-1 text-right text-theme-tertiary">
                      ${level.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
            </div>

            {bids.length === 0 && asks.length === 0 && (
              <div className="text-center text-theme-tertiary text-sm py-6">
                {t('orderBook.noOrders')}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Graph tab */
        <PriceChart outcomeId={viewOutcomeId} />
      )}
    </div>
  );
}
