'use client';

import { useState, useEffect } from 'react';
import { useRouteParams } from '@/hooks/useRouteParams';
import { useEvent, useSeriesSiblings } from '@/hooks/useEvents';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { useSpaNavigate } from '@/hooks/useSpaNavigation';
import { PriceChart } from '@/components/charts/PriceChart';
import { EventTradePanel, type SellRequest } from '@/components/events/EventTradePanel';
import { EventPositionsSection } from '@/components/events/EventPositionsSection';
import { OrderBookPanel } from '@/components/events/OrderBookPanel';
import { EventOpenOrdersSection } from '@/components/events/EventOpenOrdersSection';
import { EventHistorySection } from '@/components/events/EventHistorySection';
import { formatProbability } from '@/lib/formatProbability';
import { imageUrl } from '@/lib/imageUrl';
import type { EventDetail, Outcome, SeriesSibling } from '@hexmarket/sdk';

type ChartMode = 'price' | 'probability';

export default function PriceUpDownEventPage() {
  const { slug } = useRouteParams();
  const { data: event, isLoading } = useEvent(slug);
  const { t, locale } = useTranslation();
  const navigate = useSpaNavigate();

  const [chartMode, setChartMode] = useState<ChartMode>('price');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | undefined>();
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [sellRequest, setSellRequest] = useState<SellRequest | null>(null);

  const { data: siblings } = useSeriesSiblings(event?.id);

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
      <div className="animate-pulse space-y-6">
        <div className="bg-hex-card rounded-xl p-5 border border-hex-border h-20" />
        <div className="bg-hex-card rounded-xl border border-hex-border h-64" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-theme-secondary">{t('common.eventNotFound')}</div>;
  }

  const outcomes = event.markets.flatMap((m) => m.outcomes);
  const activeOutcomeId = selectedOutcomeId || outcomes[0]?.id;
  const activeOutcome = outcomes.find((o) => o.id === activeOutcomeId);
  const firstMarket = event.markets[0];
  const upOutcome = firstMarket?.outcomes.find((o) => o.label.toLowerCase() === 'up');
  const probability = firstMarket?.probability;

  const isMarketClosed = event.status !== 'active' ||
    (event.closeTime ? new Date(event.closeTime) <= new Date() : false);

  // Countdown
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    if (!event.closeTime) return;
    const update = () => {
      const diff = new Date(event.closeTime).getTime() - Date.now();
      if (diff <= 0) { setCountdown('00:00'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [event.closeTime]);

  // Split siblings into past/current/future
  const now = new Date();
  const pastSiblings = (siblings ?? []).filter((s) => new Date(s.closeTime) < now && s.status === 'resolved');
  const activeSiblings = (siblings ?? []).filter((s) => new Date(s.closeTime) >= now || s.status === 'active');
  const [showPast, setShowPast] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Visible tabs: current + nearby
  const nearbyActive = activeSiblings.slice(0, 4);
  const moreActive = activeSiblings.slice(4);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header: icon + title + price + countdown */}
          <div className="bg-hex-card rounded-xl p-5 border border-hex-border">
            <div className="flex items-center gap-4">
              {event.iconUrl && (
                <img
                  src={imageUrl(event.iconUrl)}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate">
                  {translateDynamic(event.title, event.titleTranslations, locale)}
                </h1>
                <div className="text-xs text-theme-tertiary mt-0.5">
                  {event.closeTime && new Date(event.closeTime).toLocaleString(locale)}
                </div>
              </div>

              {/* Probability + countdown */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {probability != null && (
                  <div className="text-center">
                    <div className="text-xs text-theme-tertiary uppercase">
                      {upOutcome ? translateDynamic(upOutcome.label, upOutcome.labelTranslations, locale) : 'Up'}
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatProbability(probability)}%
                    </div>
                  </div>
                )}
                {!isMarketClosed && countdown && (
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono text-red-400">{countdown}</div>
                    <div className="text-[10px] text-theme-tertiary uppercase tracking-wide">
                      {countdown.startsWith('00:') ? t('event.closes') : 'MINS'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-hex-card rounded-xl p-4 border border-hex-border">
            <div className="relative">
              {chartMode === 'probability' && outcomes[0] ? (
                <PriceChart outcomeId={outcomes[0].id} />
              ) : (
                <div className="h-64 flex items-center justify-center text-theme-tertiary text-sm">
                  {/* Price chart placeholder — needs external price feed */}
                  <PriceChart outcomeId={outcomes[0]?.id} />
                </div>
              )}

              {/* Chart mode toggle */}
              <button
                onClick={() => setChartMode(chartMode === 'price' ? 'probability' : 'price')}
                className="absolute bottom-2 right-2 p-2 bg-hex-dark/80 rounded-lg border border-hex-border hover:bg-hex-border transition"
                title={chartMode === 'price' ? 'Show probability' : 'Show price'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {chartMode === 'price' ? (
                    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>
                  ) : (
                    <><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Series navigation tabs */}
          {siblings && siblings.length > 1 && (
            <div className="bg-hex-card rounded-xl border border-hex-border p-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Past toggle */}
                {pastSiblings.length > 0 && (
                  <button
                    onClick={() => setShowPast(!showPast)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-hex-dark text-theme-secondary hover:text-theme-primary border border-hex-border transition"
                  >
                    Past {showPast ? '▾' : '▸'}
                  </button>
                )}

                {/* Active event tabs */}
                {nearbyActive.map((s) => {
                  const isActive = s.status === 'active' && new Date(s.closeTime) > now;
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/events/${s.slug}`)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                        s.isCurrent
                          ? 'bg-hex-blue text-white'
                          : 'bg-hex-dark text-theme-secondary hover:text-theme-primary border border-hex-border'
                      }`}
                    >
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      )}
                      {formatTime(s.closeTime)}
                    </button>
                  );
                })}

                {/* More toggle */}
                {moreActive.length > 0 && (
                  <button
                    onClick={() => setShowMore(!showMore)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-hex-dark text-theme-secondary hover:text-theme-primary border border-hex-border transition"
                  >
                    More {showMore ? '▾' : '▸'}
                  </button>
                )}
              </div>

              {/* Past expanded */}
              {showPast && pastSiblings.length > 0 && (
                <div className="mt-3 border-t border-hex-border pt-3 space-y-1">
                  {pastSiblings.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/events/${s.slug}`)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-theme-secondary hover:bg-hex-dark transition"
                    >
                      <span className={`w-2 h-2 rounded-full ${s.status === 'resolved' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span>{formatTime(s.closeTime)}</span>
                      <span className="text-theme-tertiary">· {new Date(s.closeTime).toLocaleDateString(locale)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* More expanded */}
              {showMore && moreActive.length > 0 && (
                <div className="mt-3 border-t border-hex-border pt-3 space-y-1">
                  {moreActive.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/events/${s.slug}`)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-theme-secondary hover:bg-hex-dark transition"
                    >
                      <span>{formatTime(s.closeTime)}</span>
                      <span className="text-theme-tertiary">· {new Date(s.closeTime).toLocaleDateString(locale)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Positions / Orderbook / Orders / History */}
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
        </div>

        {/* Right column — trade panel (desktop) */}
        {!isMarketClosed && (
          <div className="hidden lg:block w-[340px] flex-shrink-0">
            <div className="lg:sticky lg:top-[7.5rem]">
              {activeOutcome ? (
                <EventTradePanel
                  outcome={activeOutcome}
                  outcomes={outcomes}
                  event={event}
                  isMultiMarket={false}
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

      {/* Mobile FAB + modal */}
      {!isMarketClosed && !showTradeModal && (
        <div className="fixed bottom-4 left-4 right-4 lg:hidden z-40">
          <button
            onClick={() => setShowTradeModal(true)}
            className="w-full bg-hex-blue text-white py-3 rounded-xl font-semibold text-center"
          >
            {t('trading.trade')}
          </button>
        </div>
      )}

      {!isMarketClosed && showTradeModal && activeOutcome && (
        <div className="fixed inset-0 bg-black/60 z-50 lg:hidden flex items-end">
          <div className="w-full bg-hex-card rounded-t-2xl p-4 pb-8 max-h-[85vh] overflow-y-auto">
            <button onClick={() => setShowTradeModal(false)} className="w-full flex justify-center mb-2">
              <div className="w-10 h-1 bg-hex-border rounded-full" />
            </button>
            <EventTradePanel
              outcome={activeOutcome}
              outcomes={outcomes}
              event={event}
              isMultiMarket={false}
              onSelectOutcome={setSelectedOutcomeId}
              sellRequest={sellRequest}
            />
          </div>
        </div>
      )}
    </>
  );
}
