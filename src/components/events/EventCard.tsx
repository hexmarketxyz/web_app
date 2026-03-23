'use client';

import type { EventListItem, Outcome, MarketDetail } from '@hexmarket/sdk';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import type { Locale } from '@/i18n/config';

import { imageUrl } from '@/lib/imageUrl';

interface EventCardProps {
  event: EventListItem;
}

/** Helper: get all outcomes from all markets in an event. */
function allOutcomes(event: EventListItem): Outcome[] {
  return event.markets.flatMap((m) => m.outcomes);
}

function formatVolume(microVol: number): string {
  const vol = microVol / 1_000_000; // micro-USDC to dollars
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${Math.floor(vol)}`;
}

/** Circular probability gauge (270° arc). */
function ProbabilityRing({ pct, chanceLabel }: { pct: number; chanceLabel: string }) {
  const size = 64;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75; // 270 degrees
  const filled = arc * (pct / 100);
  const color = pct >= 50 ? '#22c55e' : '#ef4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform rotate-[135deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-700"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold font-mono leading-none">
          {pct}%
        </span>
        <span className="text-[10px] text-theme-secondary leading-tight">{chanceLabel}</span>
      </div>
    </div>
  );
}

/** Large outcome buttons for single-market cards. */
function LargeOutcomeButtons({ outcomes, locale }: { outcomes: Outcome[]; locale: Locale }) {
  return (
    <div className="flex gap-2">
      {outcomes.map((o) => {
        const label = o.label.toLowerCase();
        const isYes = label === 'yes' || label === 'up';
        const isNo = label === 'no' || label === 'down';

        return (
          <div
            key={o.id}
            className={`flex-1 py-2.5 rounded-lg text-center text-sm font-semibold ${
              isYes
                ? 'bg-hex-yes-bg/20 text-green-400'
                : isNo
                  ? 'bg-hex-no-bg/20 text-red-400'
                  : 'bg-hex-dark text-theme-primary'
            }`}
          >
            {translateDynamic(o.label, o.labelTranslations, locale)}
          </div>
        );
      })}
    </div>
  );
}

/** Compact Yes/No buttons for multi-market rows. */
function CompactOutcomeButtons({ outcomes, locale }: { outcomes: Outcome[]; locale: Locale }) {
  return (
    <div className="flex gap-1.5 flex-shrink-0">
      {outcomes.map((o) => {
        const label = o.label.toLowerCase();
        const isYes = label === 'yes' || label === 'up';
        const isNo = label === 'no' || label === 'down';

        return (
          <span
            key={o.id}
            className={`px-3 py-1 rounded text-xs font-semibold ${
              isYes
                ? 'bg-hex-yes-bg/20 text-green-400'
                : isNo
                  ? 'bg-hex-no-bg/20 text-red-400'
                  : 'bg-hex-dark text-theme-primary'
            }`}
          >
            {translateDynamic(o.label, o.labelTranslations, locale)}
          </span>
        );
      })}
    </div>
  );
}

function EventIcon({ event }: { event: EventListItem }) {
  const src = imageUrl(event.iconUrl) || event.imageUrl || null;

  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
    />
  );
}

export function EventCard({ event }: EventCardProps) {
  const { t, locale } = useTranslation();
  const totalVolume = allOutcomes(event).reduce(
    (sum: number, o) => sum + (o.totalVolume ?? 0),
    0,
  );

  const markets = event.markets;
  const isSingleMarket = markets.length <= 1;

  return (
    <a
      href={`/events/${event.slug}`}
      className="bg-hex-card rounded-xl p-5 border border-hex-border hover:border-hex-blue transition group flex flex-col"
    >
      {isSingleMarket && markets.length === 1 ? (
        /* ── Single-market card ── */
        <>
          {/* Top: icon + title (left) — probability ring (right) */}
          <div className="flex items-start gap-3 mb-4">
            <EventIcon event={event} />
            <h3 className="flex-1 font-semibold group-hover:text-hex-blue transition leading-snug">
              {translateDynamic(event.title, event.titleTranslations, locale)}
            </h3>
            <ProbabilityRing
              pct={Number(((markets[0].probability ?? 0) * 100).toFixed(0))}
              chanceLabel={t('event.chance')}
            />
          </div>

          {/* Large outcome buttons */}
          <LargeOutcomeButtons outcomes={markets[0].outcomes} locale={locale} />
        </>
      ) : (
        /* ── Multi-market card ── */
        <>
          {/* Top: icon + title */}
          <div className="flex items-start gap-3 mb-4">
            <EventIcon event={event} />
            <h3 className="font-semibold group-hover:text-hex-blue transition leading-snug">
              {translateDynamic(event.title, event.titleTranslations, locale)}
            </h3>
          </div>

          {/* Market rows */}
          <div className="space-y-3 mb-1">
            {markets.slice(0, 2).map((market, i) => (
              <MultiMarketRow key={i} market={market} locale={locale} />
            ))}
          </div>
        </>
      )}

      {/* Volume */}
      <div className="mt-auto pt-3 text-xs text-theme-tertiary">
        {formatVolume(totalVolume)} {t('event.vol')}
      </div>
    </a>
  );
}

/** Multi-market card row using API-provided probability. */
function MultiMarketRow({ market, locale }: { market: MarketDetail; locale: Locale }) {
  const pct = ((market.probability ?? 0) * 100).toFixed(0);

  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm text-theme-primary truncate min-w-0">
        {translateDynamic(market.title, market.titleTranslations, locale)}
      </span>
      <span className="font-mono font-bold text-sm flex-shrink-0 w-10 text-right">
        {pct}%
      </span>
      <CompactOutcomeButtons outcomes={market.outcomes} locale={locale} />
    </div>
  );
}
