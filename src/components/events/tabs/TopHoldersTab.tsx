'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { useTopHolders } from '@/hooks/useTopHolders';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import type { Outcome } from '@hexmarket/sdk';

interface TopHoldersTabProps {
  eventId: string;
  outcomes: Outcome[];
}

function shortPubkey(pubkey: string): string {
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

export function TopHoldersTab({ eventId, outcomes }: TopHoldersTabProps) {
  const { data: holders, isLoading } = useTopHolders(eventId);
  const { t, locale } = useTranslation();

  if (isLoading) return <div className="text-theme-secondary text-sm">{t('common.loading')}</div>;

  if (!holders?.length) {
    return (
      <div className="text-theme-tertiary text-sm text-center py-6">
        {t('topHolders.noPositions')}
      </div>
    );
  }

  // Find outcome label for an outcome ID
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
            <th className="text-left py-2 font-medium">{t('topHolders.trader')}</th>
            <th className="text-left py-2 font-medium">{t('topHolders.outcome')}</th>
            <th className="text-right py-2 font-medium">{t('topHolders.yes')}</th>
            <th className="text-right py-2 font-medium">{t('topHolders.no')}</th>
          </tr>
        </thead>
        <tbody>
          {holders.map((holder) => (
            <tr key={holder.id} className="border-b border-hex-border/50">
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <PixelAvatar address={holder.userPubkey} size={20} />
                  <span className="font-mono text-xs">
                    {shortPubkey(holder.userPubkey)}
                  </span>
                </div>
              </td>
              <td className="py-2 text-theme-secondary">
                {getOutcomeLabel(holder.outcomeId)}
              </td>
              <td className="py-2 text-right font-mono text-hex-green">
                {holder.yesQuantity > 0 ? holder.yesQuantity.toLocaleString() : '-'}
              </td>
              <td className="py-2 text-right font-mono text-hex-red">
                {holder.noQuantity > 0 ? holder.noQuantity.toLocaleString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
