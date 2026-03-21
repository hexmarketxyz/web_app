'use client';

import { useUserTrades } from '@/hooks/useUserTrades';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import type { Outcome } from '@hexmarket/sdk';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface EventHistorySectionProps {
  outcomes: Outcome[];
  bare?: boolean;
}

export function EventHistorySection({ outcomes, bare }: EventHistorySectionProps) {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { data: trades, isLoading } = useUserTrades();
  const { t, locale } = useTranslation();

  if (!publicKeyBase58 || isLoading) return null;

  const outcomeIds = new Set(outcomes.map((o) => o.id));
  const eventTrades = (trades ?? []).filter((trade) =>
    outcomeIds.has(trade.outcomeId),
  );

  if (eventTrades.length === 0) return null;

  return (
    <div className={bare ? '' : 'bg-hex-card rounded-xl border border-hex-border'}>
      {!bare && (
        <div className="px-5 py-4">
          <h3 className="font-semibold">{t('portfolio.history')}</h3>
        </div>
      )}
      <div className={bare ? '' : 'px-5 pb-4'}>
        {eventTrades.map((trade) => {
          const outcome = outcomes.find((o) => o.id === trade.outcomeId);
          const label = outcome
            ? translateDynamic(outcome.label, outcome.labelTranslations, locale)
            : '';
          const price = Number(trade.price);
          const amount = price * trade.quantity;

          // Determine side from user's perspective
          const isSelfTrade = trade.makerPubkey === trade.takerPubkey;
          const isMaker = trade.makerPubkey === publicKeyBase58;
          const userSide = isSelfTrade
            ? trade.side
            : isMaker
              ? trade.side === 'buy'
                ? 'sell'
                : 'buy'
              : trade.side;
          const isBuy = userSide === 'buy';

          return (
            <div
              key={trade.id}
              className="flex items-center justify-between py-3 border-b border-hex-border/50 last:border-0"
            >
              <div className="text-sm">
                <span
                  className={`font-semibold ${isBuy ? 'text-hex-green' : 'text-hex-red'}`}
                >
                  {isBuy ? t('portfolio.bought') : t('portfolio.sold')}
                </span>{' '}
                <span
                  className={`font-medium ${isBuy ? 'text-hex-green' : 'text-hex-red'}`}
                >
                  {trade.quantity.toFixed(2)}
                </span>{' '}
                <span className="text-theme-primary font-medium">{label}</span>{' '}
                <span className="text-theme-secondary">
                  at {(price * 100).toFixed(0)}¢
                </span>{' '}
                <span className="text-theme-tertiary">
                  (${amount.toFixed(2)})
                </span>
              </div>
              <span className="text-xs text-theme-tertiary flex-shrink-0 ml-4">
                {timeAgo(trade.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
