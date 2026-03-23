'use client';

import { useState, useRef, useMemo, useEffect } from 'react';

import { useRouteParams } from '@/hooks/useRouteParams';
import { useQueryClient } from '@tanstack/react-query';
import { useEvent } from '@/hooks/useEvents';
import { useMergedOrderBook } from '@/hooks/useMergedOrderBook';
import { usePortfolioPositions } from '@/hooks/usePortfolioPositions';
import { useAllOpenOrders } from '@/hooks/useAllOpenOrders';
import { useUserTrades } from '@/hooks/useUserTrades';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { PriceChart } from '@/components/charts/PriceChart';
import { EventTradePanel, type SellRequest } from '@/components/events/EventTradePanel';
import { EventTabs } from '@/components/events/EventTabs';
import { EventPositionsSection } from '@/components/events/EventPositionsSection';
import { EventOpenOrdersSection } from '@/components/events/EventOpenOrdersSection';
import { EventHistorySection } from '@/components/events/EventHistorySection';
import type { Outcome, LiquiditySource } from '@hexmarket/sdk';

import { imageUrl } from '@/lib/imageUrl';

interface DisplayLevel {
  price: number;
  quantity: number;
  total: number;
  cumQty: number;
  source?: LiquiditySource;
}

function askColor(source?: LiquiditySource): string {
  switch (source) {
    case 'cross_outcome': return 'text-purple-400';
    case 'mixed': return 'text-orange-400';
    default: return 'text-red-600';
  }
}

function bidColor(source?: LiquiditySource): string {
  switch (source) {
    case 'cross_outcome': return 'text-purple-400';
    case 'mixed': return 'text-orange-400';
    default: return 'text-green-600';
  }
}

function formatVolume(microVol: number): string {
  const vol = microVol / 1_000_000;
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${Math.floor(vol)}`;
}

function OrderBookSection({ outcomes, selectedOutcomeId, onSelectOutcome }: {
  outcomes: Outcome[];
  selectedOutcomeId: string;
  onSelectOutcome: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const spreadRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  const viewOutcome = outcomes.find((o) => o.id === selectedOutcomeId) || outcomes[0];
  const { data: orderbook } = useMergedOrderBook(selectedOutcomeId);

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
  // Max cumulative quantity for depth bar scaling
  const maxCumQty = Math.max(
    visibleAsks.length > 0 ? visibleAsks[visibleAsks.length - 1].cumQty : 0,
    visibleBids.length > 0 ? visibleBids[visibleBids.length - 1].cumQty : 0,
    1,
  );

  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const lastPrice = bestBid;

  return (
    <div className="bg-hex-card rounded-xl border border-hex-border">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold">{t('orderBook.title')}</span>
        <svg
          className={`w-5 h-5 text-theme-tertiary transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5">
          {/* Outcome tabs */}
          <div className="flex gap-4 mb-4">
            {outcomes.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onSelectOutcome(o.id)}
                className={`text-sm font-medium transition ${
                  o.id === selectedOutcomeId
                    ? 'text-theme-primary font-semibold'
                    : 'text-theme-tertiary hover:text-theme-secondary'
                }`}
              >
                {t('orderBook.tradeLabel')} {translateDynamic(o.label, o.labelTranslations, locale)}
              </button>
            ))}
          </div>

          {/* Column headers */}
          <div className="flex text-[10px] uppercase tracking-wider text-theme-tertiary font-medium mb-1 px-1">
            <span className="w-20" />
            <span className="flex-1 text-right">{t('orderBook.price')}</span>
            <span className="flex-1 text-right">{t('orderBook.shares')}</span>
            <span className="flex-1 text-right">{t('orderBook.total')}</span>
          </div>

          {/* Orderbook body */}
          <div className="max-h-[280px] overflow-y-auto">
            <div>
              {visibleAsks
                .slice()
                .reverse()
                .map((level, i, arr) => {
                  const depthPct = (level.cumQty / maxCumQty) * 100;
                  return (
                    <div key={`ask-${i}`} className="flex items-center text-sm font-mono h-7 px-1">
                      {/* Depth column */}
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
                      <span className={`flex-1 text-right ${askColor(level.source)}`}>{(level.price * 100).toFixed(1)}¢</span>
                      <span className="flex-1 text-right text-theme-secondary">{level.quantity.toFixed(2)}</span>
                      <span className="flex-1 text-right text-theme-tertiary">${level.total.toFixed(2)}</span>
                    </div>
                  );
                })}
            </div>

            <div
              ref={spreadRef}
              className="flex items-center justify-between text-xs text-theme-tertiary py-2 px-1 my-1 border-y border-hex-border"
            >
              <span>{t('orderBook.last')} {lastPrice != null ? `${(lastPrice * 100).toFixed(1)}¢` : '—'}</span>
              <span>{t('orderBook.spread')} {spread != null ? `${(spread * 100).toFixed(1)}¢` : '—'}</span>
            </div>

            <div>
              {visibleBids.map((level, i) => {
                const depthPct = (level.cumQty / maxCumQty) * 100;
                return (
                  <div key={`bid-${i}`} className="flex items-center text-sm font-mono h-7 px-1">
                    {/* Depth column */}
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
                    <span className={`flex-1 text-right ${bidColor(level.source)}`}>{(level.price * 100).toFixed(1)}¢</span>
                    <span className="flex-1 text-right text-theme-secondary">{level.quantity.toFixed(2)}</span>
                    <span className="flex-1 text-right text-theme-tertiary">${level.total.toFixed(2)}</span>
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
      )}
    </div>
  );
}

/** Conditional tabs for market detail: positions, open orders, orderbook, chart, history */
function MarketDetailTabs({
  outcomes,
  selectedOutcomeId,
  onSelectOutcome,
  onSell,
}: {
  outcomes: Outcome[];
  selectedOutcomeId: string;
  onSelectOutcome: (id: string) => void;
  onSell?: (outcomeId: string, quantity: number) => void;
}) {
  const { t } = useTranslation();
  const { data: positions } = usePortfolioPositions();
  const { data: allOrders } = useAllOpenOrders();
  const { data: trades } = useUserTrades();

  const outcomeIds = useMemo(() => new Set(outcomes.map((o) => o.id)), [outcomes]);

  const hasPositions = (positions ?? []).some(
    (p) => outcomeIds.has(p.outcomeId) && p.quantity > 0,
  );
  const hasOrders = (allOrders ?? []).some((o) => outcomeIds.has(o.outcomeId));
  const hasTrades = (trades ?? []).some((trade) => outcomeIds.has(trade.outcomeId));

  const tabs = useMemo(() => {
    const result = [];
    if (hasPositions) {
      result.push({
        key: 'positions',
        label: t('portfolio.positions'),
        content: <EventPositionsSection outcomes={outcomes} bare onSell={onSell} />,
      });
    }
    if (hasOrders) {
      result.push({
        key: 'orders',
        label: t('portfolio.openOrders'),
        content: <EventOpenOrdersSection outcomes={outcomes} bare />,
      });
    }
    result.push({
      key: 'orderbook',
      label: t('orderBook.title'),
      content: (
        <OrderBookSection
          outcomes={outcomes}
          selectedOutcomeId={selectedOutcomeId}
          onSelectOutcome={onSelectOutcome}
        />
      ),
    });
    result.push({
      key: 'chart',
      label: t('orderBook.graph'),
      content: <PriceChart outcomeId={outcomes[0]?.id} />,
    });
    if (hasTrades) {
      result.push({
        key: 'history',
        label: t('portfolio.history'),
        content: <EventHistorySection outcomes={outcomes} bare />,
      });
    }
    return result;
  }, [hasPositions, hasOrders, hasTrades, outcomes, selectedOutcomeId, onSelectOutcome, t]);

  return <EventTabs tabs={tabs} />;
}

function MarketBadges({ outcomes }: { outcomes: Outcome[] }) {
  const { t, locale } = useTranslation();
  const { data: positions } = usePortfolioPositions();
  const { data: allOrders } = useAllOpenOrders();

  const outcomeIds = useMemo(() => new Set(outcomes.map((o) => o.id)), [outcomes]);
  const marketOrders = (allOrders ?? []).filter((o) => outcomeIds.has(o.outcomeId));
  const marketPositions = (positions ?? []).filter(
    (p) => outcomeIds.has(p.outcomeId) && p.quantity > 0,
  );

  if (marketOrders.length === 0 && marketPositions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {marketOrders.length > 0 && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-red-400/50 text-red-400">
          {marketOrders.length} {marketOrders.length === 1 ? t('eventDetail.openOrder') : t('eventDetail.openOrders')}
        </span>
      )}
      {marketPositions.map((pos) => {
        const outcome = outcomes.find((o) => o.id === pos.outcomeId);
        if (!outcome) return null;
        const lbl = outcome.label.toLowerCase();
        const isYes = lbl === 'yes' || lbl === 'up';
        const outcomeLabel = translateDynamic(outcome.label, outcome.labelTranslations, locale);
        const avgPrice = pos.avgPrice != null ? (pos.avgPrice * 100).toFixed(1) : '—';
        return (
          <span
            key={pos.outcomeId}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isYes
                ? 'border-green-400/50 text-green-400'
                : 'border-orange-400/50 text-orange-400'
            }`}
          >
            <span className={isYes ? 'text-green-400' : 'text-red-400'}>{outcomeLabel}</span>
            <span>{pos.quantity}</span>
            <span>·</span>
            <span>{avgPrice}¢</span>
          </span>
        );
      })}
    </div>
  );
}

function MarketProbability({ probability }: { probability?: number }) {
  const { t } = useTranslation();
  const pct = ((probability ?? 0) * 100).toFixed(0);
  return <span className="text-2xl font-bold text-green-400">{pct}% {t('event.chance')}</span>;
}

function BottomBuyButton({
  outcome,
  bestAsk,
  onBuy,
}: {
  outcome: Outcome;
  bestAsk: number;
  onBuy: () => void;
}) {
  const { t, locale } = useTranslation();
  const price = (bestAsk * 100).toFixed(0);
  const lbl = outcome.label.toLowerCase();
  const isYes = lbl === 'yes' || lbl === 'up';

  return (
    <button
      type="button"
      onClick={onBuy}
      className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition ${
        isYes
          ? 'bg-green-600 hover:bg-green-700'
          : 'bg-red-500 hover:bg-red-600'
      }`}
    >
      {t('trading.buy')} {translateDynamic(outcome.label, outcome.labelTranslations, locale)} {price}¢
    </button>
  );
}

export default function MarketDetailPage() {
  const { slug, marketId } = useRouteParams();
  const { data: event, isLoading } = useEvent(slug);
  const { t, locale } = useTranslation();
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | undefined>();
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [sellRequest, setSellRequest] = useState<SellRequest | null>(null);

  // Lock body scroll when trade modal is open (mobile only)
  useEffect(() => {
    if (showTradeModal) {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      if (isDesktop) return;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showTradeModal]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-hex-border/50 rounded w-3/4" />
        <div className="h-6 bg-hex-border/30 rounded w-1/3" />
        <div className="bg-hex-card rounded-xl border border-hex-border h-64" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-theme-secondary">{t('common.eventNotFound')}</div>;
  }

  const market = event.markets?.find((m) => m.id === marketId);
  const marketOutcomes = market?.outcomes ?? [];

  if (!market || marketOutcomes.length === 0) {
    return <div className="text-theme-secondary">{t('common.eventNotFound')}</div>;
  }

  const activeOutcomeId = selectedOutcomeId || marketOutcomes[0]?.id;
  const activeOutcome = marketOutcomes.find((o) => o.id === activeOutcomeId) || marketOutcomes[0];
  const firstOutcome = marketOutcomes[0];
  const totalVolume = marketOutcomes.reduce((sum, o) => sum + (o.totalVolume ?? 0), 0);

  const marketTitle = translateDynamic(market.title, market.titleTranslations, locale);
  const iconUrl = market.iconUrl || event.iconUrl;

  return (
    <>
      <div className="space-y-4 pb-24">
        {/* Top bar: back + action icons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="p-2 -ml-2 text-theme-secondary hover:text-theme-primary transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="text-theme-tertiary hover:text-theme-primary transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
            <button
              type="button"
              className="text-theme-tertiary hover:text-theme-primary transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Market title + icon */}
        <div className="flex items-center gap-3">
          {iconUrl && (
            <img
              src={imageUrl(iconUrl)}
              alt=""
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <h1 className="text-xl font-bold leading-snug">{marketTitle}</h1>
        </div>

        {/* Probability + volume */}
        <div className="flex items-center gap-3">
          <MarketProbability probability={market.probability} />
          <span className="text-sm text-theme-tertiary">{formatVolume(totalVolume)} {t('event.vol')}</span>
        </div>

        {/* Position & order badges */}
        <MarketBadges outcomes={marketOutcomes} />

        {/* Tabs — positions, orders, orderbook, chart, history */}
        <MarketDetailTabs
          outcomes={marketOutcomes}
          selectedOutcomeId={activeOutcomeId || marketOutcomes[0]?.id}
          onSelectOutcome={setSelectedOutcomeId}
          onSell={(id, qty) => {
            setSelectedOutcomeId(id);
            setSellRequest({ outcomeId: id, quantity: qty });
            setShowTradeModal(true);
          }}
        />
      </div>

      {/* Fixed bottom action buttons */}
      {!showTradeModal && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-hex-dark border-t border-hex-border px-4 py-3">
          <div className="flex gap-3">
            {marketOutcomes.map((o) => (
              <BottomBuyButton
                key={o.id}
                outcome={o}
                bestAsk={market.bestAsks?.[o.id] ?? 0}
                onBuy={() => {
                  setSelectedOutcomeId(o.id);
                  setShowTradeModal(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trade modal bottom sheet */}
      {showTradeModal && activeOutcome && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowTradeModal(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-hex-dark animate-slide-up">
            <div className="sticky top-0 z-10 bg-hex-dark pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-hex-border" />
            </div>
            <EventTradePanel
              outcome={activeOutcome}
              outcomes={marketOutcomes}
              event={event}
              isMultiMarket
              onSelectOutcome={(id) => setSelectedOutcomeId(id)}
              sellRequest={sellRequest}
            />
          </div>
        </div>
      )}
    </>
  );
}
