'use client';

import { useRecentTrades } from '@/hooks/useRecentTrades';
import { useTranslation } from '@/hooks/useTranslation';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function RecentTrades({ outcomeId }: { outcomeId: string }) {
  const { data: trades, isLoading } = useRecentTrades(outcomeId);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-5 bg-hex-border/30 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-theme-tertiary mb-2">
        <span>{t('recentTrades.price')}</span>
        <span>{t('recentTrades.qty')}</span>
        <span>{t('recentTrades.time')}</span>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1">
        {trades?.map((trade) => (
          <div key={trade.id} className="flex justify-between text-sm font-mono">
            <span
              className={
                trade.side === 'buy' ? 'text-hex-green' : 'text-hex-red'
              }
            >
              {(Number(trade.price) * 100).toFixed(0)}¢
            </span>
            <span className="text-theme-secondary">{trade.quantity}</span>
            <span className="text-theme-tertiary">{timeAgo(trade.createdAt)}</span>
          </div>
        ))}
      </div>

      {(!trades || trades.length === 0) && (
        <div className="text-center text-theme-tertiary text-sm py-4">
          {t('recentTrades.noTrades')}
        </div>
      )}
    </div>
  );
}
