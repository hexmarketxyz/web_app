'use client';

import { useQuery } from '@tanstack/react-query';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import type { Outcome } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Position {
  id: string;
  userPubkey: string;
  outcomeId: string;
  yesQuantity: number;
  noQuantity: number;
  realizedPnl: number;
  updatedAt: string;
}

interface PositionsTabProps {
  outcomes: Outcome[];
}

export function PositionsTab({ outcomes }: PositionsTabProps) {
  const { publicKey } = useUnifiedWallet();
  const { t, locale } = useTranslation();

  const { data: positions, isLoading } = useQuery<Position[]>({
    queryKey: ['positions', publicKey],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/positions?user=${publicKey}`
      );
      if (!res.ok) throw new Error('Failed to fetch positions');
      return res.json();
    },
    enabled: !!publicKey,
  });

  if (!publicKey) {
    return (
      <div className="text-theme-tertiary text-sm text-center py-6">
        {t('auth.connectWallet')}
      </div>
    );
  }

  if (isLoading) return <div className="text-theme-secondary text-sm">{t('common.loading')}</div>;

  // Filter positions for this event's outcomes
  const outcomeIds = new Set(outcomes.map((o) => o.id));
  const eventPositions = positions?.filter((p) => outcomeIds.has(p.outcomeId)) ?? [];

  if (eventPositions.length === 0) {
    return (
      <div className="text-theme-tertiary text-sm text-center py-6">
        {t('positions.noPositions')}
      </div>
    );
  }

  const getOutcomeLabel = (outcomeId: string) => {
    const outcome = outcomes.find((o) => o.id === outcomeId);
    if (!outcome) return 'Unknown';
    return translateDynamic(outcome.label, outcome.labelTranslations, locale);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-theme-tertiary border-b border-hex-border">
            <th className="text-left py-2 font-medium">{t('positions.outcome')}</th>
            <th className="text-right py-2 font-medium">{t('positions.yesShares')}</th>
            <th className="text-right py-2 font-medium">{t('positions.noShares')}</th>
            <th className="text-right py-2 font-medium">{t('positions.pnl')}</th>
          </tr>
        </thead>
        <tbody>
          {eventPositions.map((pos) => (
            <tr key={pos.id} className="border-b border-hex-border/50">
              <td className="py-2 font-medium">
                {getOutcomeLabel(pos.outcomeId)}
              </td>
              <td className="py-2 text-right font-mono text-hex-green">
                {pos.yesQuantity > 0 ? pos.yesQuantity.toLocaleString() : '-'}
              </td>
              <td className="py-2 text-right font-mono text-hex-red">
                {pos.noQuantity > 0 ? pos.noQuantity.toLocaleString() : '-'}
              </td>
              <td className={`py-2 text-right font-mono ${pos.realizedPnl >= 0 ? 'text-hex-green' : 'text-hex-red'}`}>
                ${(pos.realizedPnl / 1_000_000).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
