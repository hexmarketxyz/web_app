'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import type { Outcome } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Trade {
  id: string;
  outcomeId: string;
  makerPubkey: string;
  takerPubkey: string;
  outcome: string;
  side: string;
  price: number;
  quantity: number;
  createdAt: string;
}

interface ActivityTabProps {
  eventId: string;
  outcomes: Outcome[];
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function shortPubkey(pubkey: string): string {
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

export function ActivityTab({ eventId, outcomes }: ActivityTabProps) {
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['eventActivity', eventId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/events/${eventId}/activity?limit=50`
      );
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json();
    },
    enabled: !!eventId,
    refetchInterval: 10_000,
  });
  const { t, locale } = useTranslation();

  if (isLoading) return <div className="text-theme-secondary text-sm">{t('common.loading')}</div>;

  if (!trades?.length) {
    return (
      <div className="text-theme-tertiary text-sm text-center py-6">
        {t('activity.noActivity')}
      </div>
    );
  }

  const getOutcomeLabel = (outcomeId: string) => {
    const outcome = outcomes.find((o) => o.id === outcomeId);
    if (!outcome) return 'Market';
    return translateDynamic(outcome.label, outcome.labelTranslations, locale);
  };

  return (
    <div className="space-y-2">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="flex items-center gap-3 py-2 border-b border-hex-border/30 last:border-0"
        >
          <PixelAvatar address={trade.takerPubkey} size={24} />
          <div className="flex-1 min-w-0 text-sm">
            <span className="font-mono text-xs">
              {shortPubkey(trade.takerPubkey)}
            </span>{' '}
            <span
              className={
                trade.side === 'buy' ? 'text-hex-green' : 'text-hex-red'
              }
            >
              {trade.side === 'buy' ? t('activity.bought') : t('activity.sold')}
            </span>{' '}
            <span className="text-theme-primary font-medium">
              {trade.quantity}
            </span>{' '}
            <span className="text-theme-secondary">
              {trade.outcome.toUpperCase()} {getOutcomeLabel(trade.outcomeId)}
            </span>{' '}
            <span className="text-theme-tertiary">
              @ {(trade.price * 100).toFixed(0)}¢
            </span>
          </div>
          <span className="text-xs text-theme-tertiary flex-shrink-0">
            {timeAgo(trade.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
