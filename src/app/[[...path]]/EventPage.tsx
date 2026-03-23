'use client';

import { useState, useEffect } from 'react';
import { useRouteParams } from '@/hooks/useRouteParams';
import { useEvent } from '@/hooks/useEvents';
import { useUserEvents } from '@/hooks/useUserEvents';
import { useTranslation } from '@/hooks/useTranslation';
import { EventHeader } from '@/components/events/EventHeader';
import { OrderBookPanel } from '@/components/events/OrderBookPanel';
import { MarketList } from '@/components/events/MarketList';
import { EventTradePanel, type SellRequest } from '@/components/events/EventTradePanel';
import { EventTabs } from '@/components/events/EventTabs';
import { PriceChart } from '@/components/charts/PriceChart';
import { MultiMarketChart } from '@/components/charts/MultiMarketChart';
import { EventPositionsSection } from '@/components/events/EventPositionsSection';
import { EventOpenOrdersSection } from '@/components/events/EventOpenOrdersSection';
import { EventHistorySection } from '@/components/events/EventHistorySection';
import { CommentsTab } from '@/components/events/tabs/CommentsTab';
import { TopHoldersTab } from '@/components/events/tabs/TopHoldersTab';
import { PositionsTab } from '@/components/events/tabs/PositionsTab';
import { ActivityTab } from '@/components/events/tabs/ActivityTab';
import type { EventDetail, Outcome } from '@hexmarket/sdk';

function formatVolume(microVol: number): string {
  const vol = microVol / 1_000_000;
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${Math.floor(vol)}`;
}

function EventStats({ event, outcomes }: { event: EventDetail; outcomes: Outcome[] }) {
  const { t, locale } = useTranslation();
  const totalVolume = outcomes.reduce((sum, o) => sum + (o.totalVolume ?? 0), 0);

  return (
    <div className="flex items-center gap-2 text-sm text-theme-secondary">
      <span>{formatVolume(totalVolume)} {t('event.vol')}</span>
      {event.closeTime && (
        <>
          <span className="text-theme-tertiary">|</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-tertiary">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{new Date(event.closeTime).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </>
      )}
    </div>
  );
}

export default function EventPage() {
  const { slug } = useRouteParams();
  const { data: event, isLoading } = useEvent(slug);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | undefined>();
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [sellRequest, setSellRequest] = useState<SellRequest | null>(null);
  const { t } = useTranslation();
  useUserEvents();

  // Lock body scroll when trade modal is open (mobile only — modal is lg:hidden)
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
      <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="bg-hex-card rounded-xl p-5 border border-hex-border space-y-3">
            <div className="h-6 bg-hex-border/50 rounded w-3/4" />
            <div className="h-4 bg-hex-border/30 rounded w-1/2" />
          </div>
          <div className="bg-hex-card rounded-xl border border-hex-border h-64" />
          <div className="bg-hex-card rounded-xl border border-hex-border p-4 space-y-3">
            <div className="h-10 bg-hex-border/30 rounded" />
            <div className="h-10 bg-hex-border/30 rounded" />
          </div>
        </div>
        <div className="w-full lg:w-[340px] flex-shrink-0">
          <div className="bg-hex-card rounded-xl border border-hex-border h-80" />
        </div>
      </div>
    );
  }

  if (!event) {
    return <div className="text-theme-secondary">{t('common.eventNotFound')}</div>;
  }

  // Flatten outcomes from all markets for components that expect a flat list
  const outcomes = event.markets.flatMap((m) => m.outcomes);

  // Default to first outcome
  const activeOutcomeId = selectedOutcomeId || outcomes[0]?.id;
  const activeOutcome = outcomes.find((o) => o.id === activeOutcomeId);

  // Multi-market if more than one market
  const isMultiMarket = event.markets.length > 1;

  // Market is closed if status is not active or close time has passed
  const isMarketClosed = event.status !== 'active' ||
    (event.closeTime ? new Date(event.closeTime) <= new Date() : false);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Event Header — inside left column */}
          <EventHeader event={event} />

          {/* Price Chart — multi-market: show first 4 markets; single: show first outcome */}
          {event.markets.length > 0 && (
            <div className="bg-hex-card rounded-xl p-4 border border-hex-border">
              {isMultiMarket ? (
                <MultiMarketChart markets={event.markets.slice(0, 4)} />
              ) : (
                <PriceChart outcomeId={event.markets[0].outcomes[0]?.id} />
              )}
            </div>
          )}

          {/* Event Stats: Volume + Close Date */}
          <EventStats event={event} outcomes={outcomes} />

          {/* Outcome / Market List */}
          {isMultiMarket ? (
            <MarketList
              outcomes={outcomes}
              markets={event.markets}
              selectedId={activeOutcomeId}
              onSelect={setSelectedOutcomeId}
              eventSlug={slug}
              onBuy={(id) => {
                setSelectedOutcomeId(id);
                setShowTradeModal(true);
              }}
              onSell={(id, qty) => {
                setSelectedOutcomeId(id);
                setSellRequest({ outcomeId: id, quantity: qty });
              }}
            />
          ) : (
            <>
              {/* Single-market: inline sections */}
              <EventPositionsSection
                outcomes={outcomes}
                onSell={(id, qty) => {
                  setSelectedOutcomeId(id);
                  setSellRequest({ outcomeId: id, quantity: qty });
                  setShowTradeModal(true);
                }}
              />

              {!isMarketClosed && (
                <OrderBookPanel
                  outcomes={outcomes}
                  selectedOutcomeId={activeOutcomeId}
                  onSelectOutcome={setSelectedOutcomeId}
                />
              )}

              <EventOpenOrdersSection outcomes={outcomes} />

              <EventHistorySection outcomes={outcomes} />
            </>
          )}
        </div>

        {/* Right column — sticky trade panel (desktop only) */}
        {!isMarketClosed && (
          <div className="hidden lg:block w-[340px] flex-shrink-0">
            <div className="lg:sticky lg:top-[7.5rem]">
              {activeOutcome ? (
                <EventTradePanel
                  outcome={activeOutcome}
                  outcomes={outcomes}
                  event={event}
                  isMultiMarket={isMultiMarket}
                  onSelectOutcome={setSelectedOutcomeId}
                  sellRequest={sellRequest}
                />
              ) : (
                <div className="bg-hex-card rounded-xl border border-hex-border p-4 text-theme-tertiary text-sm text-center">
                  {t('trading.selectOutcome')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comments / Top Holders / Positions / Activity */}
      <div className="mt-6">
        <EventTabs
          tabs={[
            { key: 'comments', label: t('tabs.comments'), content: <CommentsTab eventId={event.id} /> },
            { key: 'topHolders', label: t('tabs.topHolders'), content: <TopHoldersTab eventId={event.id} outcomes={outcomes} /> },
            { key: 'positions', label: t('tabs.positions'), content: <PositionsTab outcomes={outcomes} /> },
            { key: 'activity', label: t('tabs.activity'), content: <ActivityTab eventId={event.id} outcomes={outcomes} /> },
          ]}
        />
      </div>

      {/* Mobile: fixed bottom buy button for single-market events */}
      {!isMultiMarket && !isMarketClosed && !showTradeModal && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden p-4 bg-gradient-to-t from-hex-dark via-hex-dark/95 to-transparent">
          <button
            type="button"
            onClick={() => setShowTradeModal(true)}
            className="w-full py-3 rounded-xl bg-hex-blue hover:bg-blue-600 text-white font-semibold transition"
          >
            {t('trading.trade')}
          </button>
        </div>
      )}

      {/* Mobile bottom-sheet trade modal */}
      {!isMarketClosed && showTradeModal && activeOutcome && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowTradeModal(false)}
          />
          {/* Bottom sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-hex-dark animate-slide-up">
            {/* Handle bar */}
            <div className="sticky top-0 z-10 bg-hex-dark pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-hex-border" />
            </div>
            <EventTradePanel
              outcome={activeOutcome}
              outcomes={outcomes}
              event={event}
              isMultiMarket={isMultiMarket}
              onSelectOutcome={(id) => {
                setSelectedOutcomeId(id);
              }}
              sellRequest={sellRequest}
            />
          </div>
        </div>
      )}
    </>
  );
}
