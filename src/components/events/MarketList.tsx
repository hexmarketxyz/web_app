'use client';

import { useState, useMemo } from 'react';
import { useSpaNavigate } from '@/hooks/useSpaNavigation';
import type { Outcome, MarketDetail } from '@hexmarket/sdk';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { usePortfolioPositions } from '@/hooks/usePortfolioPositions';
import { useAllOpenOrders } from '@/hooks/useAllOpenOrders';
import { MarketDetailPanel } from './MarketDetailPanel';
import { formatProbability, formatPriceCents } from '@/lib/formatProbability';

import type { Locale } from '@/i18n/config';
import { imageUrl } from '@/lib/imageUrl';

interface MarketListProps {
  outcomes: Outcome[];
  markets: MarketDetail[];
  selectedId?: string;
  onSelect: (outcomeId: string) => void;
  eventSlug?: string;
  onBuy?: (outcomeId: string) => void;
  onSell?: (outcomeId: string, quantity: number) => void;
  /** How to sort: 'probability_desc' (default) or 'sort_order' */
  sortBy?: string;
}

export function MarketList({ outcomes, markets, selectedId, onSelect, eventSlug, onBuy, onSell, sortBy }: MarketListProps) {
  const { t } = useTranslation();
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const sortedMarkets = useMemo(() => {
    const active = markets.filter((m) => m.status === 'active');
    if (sortBy === 'sort_order') return active;
    return [...active].sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
  }, [markets, sortBy]);

  const resolvedMarkets = useMemo(() => {
    return markets.filter((m) => m.status === 'resolved');
  }, [markets]);

  return (
    <div className="space-y-0">
      <div className="bg-hex-card rounded-xl border border-hex-border divide-y divide-hex-border">
        {sortedMarkets.map((market) => (
          <MarketRow
            key={market.id}
            market={market}
            outcomes={outcomes}
            selectedId={selectedId}
            onSelect={onSelect}
            eventSlug={eventSlug}
            onBuy={onBuy}
            onSell={onSell}
            isExpanded={expandedMarketId === market.id}
            onToggleExpand={() => setExpandedMarketId(expandedMarketId === market.id ? null : market.id)}
          />
        ))}
      </div>

      {/* Resolved markets toggle */}
      {resolvedMarkets.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-1.5 text-sm text-theme-secondary hover:text-theme-primary transition px-1 py-1"
          >
            {showResolved ? t('event.hideResolved') : t('event.viewResolved')}
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showResolved ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showResolved && (
            <div className="bg-hex-card rounded-xl border border-hex-border divide-y divide-hex-border mt-2">
              {resolvedMarkets.map((market) => (
                <ResolvedMarketRow
                  key={market.id}
                  market={market}
                  outcomes={outcomes}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  isExpanded={expandedMarketId === market.id}
                  onToggleExpand={() => setExpandedMarketId(expandedMarketId === market.id ? null : market.id)}
                  onSell={onSell}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Resolved Market Row ─────────────────────────────────── */

interface ResolvedMarketRowProps {
  market: MarketDetail;
  outcomes: Outcome[];
  selectedId?: string;
  onSelect: (outcomeId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSell?: (outcomeId: string, quantity: number) => void;
}

function ResolvedMarketRow({ market, outcomes, selectedId, onSelect, isExpanded, onToggleExpand, onSell }: ResolvedMarketRowProps) {
  const { t, locale } = useTranslation();
  const winningOutcome = market.outcomes.find((o) => o.outcome === 'yes');
  const winLabel = winningOutcome
    ? translateDynamic(winningOutcome.label, winningOutcome.labelTranslations, locale)
    : '—';
  const vol = Math.floor(market.outcomes.reduce((s, o) => s + (o.totalVolume ?? 0), 0) / 1_000_000);

  return (
    <div>
      <div
        className={`px-5 py-4 flex items-center gap-4 opacity-70 cursor-pointer hover:bg-hex-overlay/[0.02] transition ${
          isExpanded ? 'bg-hex-blue/5' : ''
        }`}
        onClick={() => {
          onToggleExpand();
          if (market.outcomes[0]) onSelect(market.outcomes[0].id);
        }}
      >
        {market.iconUrl && (
          <img src={imageUrl(market.iconUrl)} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {translateDynamic(market.title, market.titleTranslations, locale)}
          </div>
          <div className="text-xs text-theme-tertiary mt-0.5">
            ${vol.toLocaleString()} {t('event.vol')}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-medium">{winLabel}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-500">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Expanded detail — no orderbook tab */}
      {isExpanded && (
        <MarketDetailPanel
          outcomes={market.outcomes}
          selectedOutcomeId={selectedId}
          onSelectOutcome={onSelect}
          onSell={onSell}
          isResolved
        />
      )}
    </div>
  );
}

/* ─── Market Row ────────────────────────────────────────────── */

interface MarketRowProps {
  market: MarketDetail;
  outcomes: Outcome[];
  selectedId?: string;
  onSelect: (outcomeId: string) => void;
  eventSlug?: string;
  onBuy?: (outcomeId: string) => void;
  onSell?: (outcomeId: string, quantity: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function MarketRow({ market, outcomes, selectedId, onSelect, eventSlug, onBuy, onSell, isExpanded, onToggleExpand }: MarketRowProps) {
  const { t, locale } = useTranslation();
  const navigate = useSpaNavigate();
  const { data: positions } = usePortfolioPositions();
  const { data: allOrders } = useAllOpenOrders();

  const firstOutcome = market.outcomes[0];

  // Use API-provided probability
  const pct = formatProbability(market.probability ?? 0);

  // Badges: open orders and positions for this market
  const marketOutcomeIds = new Set(market.outcomes.map((o) => o.id));
  const marketOrders = (allOrders ?? []).filter((o) => marketOutcomeIds.has(o.outcomeId));
  const marketPositions = (positions ?? []).filter(
    (p) => marketOutcomeIds.has(p.outcomeId) && p.quantity > 0,
  );

  return (
    <div>
      {/* Market row */}
      <div
        className={`px-5 py-4 transition cursor-pointer hover:bg-hex-overlay/[0.02] ${
          isExpanded ? 'bg-hex-blue/5' : ''
        }`}
        onClick={() => {
          // Mobile: navigate to market detail page
          if (eventSlug && window.innerWidth < 1024) {
            navigate(`/events/${eventSlug}/market/${market.id}`);
            return;
          }
          // Desktop: expand/collapse inline
          onToggleExpand();
          onSelect(firstOutcome.id);
        }}
      >
        {/* Top row: Icon + Title + Volume + Probability + Chevron */}
        <div className="flex items-center gap-4">
          {market.iconUrl && (
            <img
              src={imageUrl(market.iconUrl)}
              alt=""
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {translateDynamic(market.title, market.titleTranslations, locale)}
            </div>
            <div className="text-xs text-theme-tertiary mt-0.5">
              ${Math.floor(market.outcomes.reduce((s, o) => s + (o.totalVolume ?? 0), 0) / 1_000_000)} {t('event.vol')}
            </div>
          </div>

          {/* Probability */}
          <div className="flex-shrink-0 text-center w-20">
            <span className="text-2xl font-bold font-mono">{pct}%</span>
          </div>

          {/* Desktop: inline buy buttons */}
          <div className="hidden lg:flex gap-2 flex-shrink-0">
            {market.outcomes.map((o) => (
              <OutcomeBuyButton
                key={o.id}
                outcome={o}
                locale={locale}
                bestAsk={market.bestAsks?.[o.id] ?? market.bestBids?.[o.id] ?? 0}
                isSelected={o.id === selectedId}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(o.id);
                }}
              />
            ))}
          </div>

          {/* Expand/collapse chevron (desktop) / forward arrow (mobile) */}
          <svg
            className={`w-4 h-4 text-theme-tertiary flex-shrink-0 transition-transform hidden lg:block ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <svg
            className="w-4 h-4 text-theme-tertiary flex-shrink-0 lg:hidden"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Mobile: buy buttons on own row */}
        <div className="flex gap-2 mt-3 lg:hidden">
          {market.outcomes.map((o) => (
            <MobileBuyButton
              key={o.id}
              outcome={o}
              locale={locale}
              bestAsk={market.bestAsks?.[o.id] ?? market.bestBids?.[o.id] ?? 0}
              onBuy={onBuy}
            />
          ))}
        </div>

        {/* Position & order badges */}
        {(marketOrders.length > 0 || marketPositions.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {marketOrders.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-red-400/50 text-red-400">
                {marketOrders.length} {marketOrders.length === 1 ? t('eventDetail.openOrder') : t('eventDetail.openOrders')}
              </span>
            )}
            {marketPositions.map((pos) => {
              const outcome = market.outcomes.find((o) => o.id === pos.outcomeId);
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
        )}
      </div>

      {/* Expanded detail panel (desktop only) */}
      {isExpanded && (
        <div className="hidden lg:block">
          <MarketDetailPanel
            outcomes={market.outcomes}
            selectedOutcomeId={selectedId}
            onSelectOutcome={onSelect}
            onSell={onSell}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Buy Buttons (use API-provided bestAsk) ──────────────── */

function OutcomeBuyButton({
  outcome,
  locale,
  bestAsk,
  isSelected,
  onClick,
}: {
  outcome: Outcome;
  locale: Locale;
  bestAsk: number;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  const price = formatPriceCents(bestAsk);
  const lbl = outcome.label.toLowerCase();
  const isYes = lbl === 'yes' || lbl === 'up';
  const isNo = lbl === 'no' || lbl === 'down';

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
        isSelected ? 'ring-2 ring-hex-blue' : ''
      } ${
        isYes
          ? 'bg-hex-yes-bg/20 text-green-400 hover:bg-hex-yes-bg/30 border border-green-600/30'
          : isNo
            ? 'bg-hex-no-bg/20 text-red-400 hover:bg-hex-no-bg/30 border border-red-600/30'
            : 'bg-hex-dark text-theme-primary hover:bg-hex-overlay/10 border border-hex-border'
      }`}
    >
      {t('trading.buy')} {translateDynamic(outcome.label, outcome.labelTranslations, locale)} {price}¢
    </button>
  );
}

function MobileBuyButton({
  outcome,
  locale,
  bestAsk,
  onBuy,
}: {
  outcome: Outcome;
  locale: Locale;
  bestAsk: number;
  onBuy?: (outcomeId: string) => void;
}) {
  const { t } = useTranslation();
  const price = formatPriceCents(bestAsk);
  const lbl = outcome.label.toLowerCase();
  const isYes = lbl === 'yes' || lbl === 'up';
  const isNo = lbl === 'no' || lbl === 'down';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onBuy) onBuy(outcome.id);
      }}
      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
        isYes
          ? 'bg-hex-yes-bg/20 text-green-400 hover:bg-hex-yes-bg/30 border border-green-600/30'
          : isNo
            ? 'bg-hex-no-bg/20 text-red-400 hover:bg-hex-no-bg/30 border border-red-600/30'
            : 'bg-hex-dark text-theme-primary hover:bg-hex-overlay/10 border border-hex-border'
      }`}
    >
      {t('trading.buy')} {translateDynamic(outcome.label, outcome.labelTranslations, locale)} {price}¢
    </button>
  );
}
