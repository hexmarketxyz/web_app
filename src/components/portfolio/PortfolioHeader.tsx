'use client';

import { useUsdcBalance } from '@/hooks/useUsdcBalance';
import { useTranslation } from '@/hooks/useTranslation';
import type { Position } from '@/hooks/usePortfolioPositions';
import type { Outcome } from '@hexmarket/sdk';

interface PortfolioHeaderProps {
  positions: Position[];
  outcomeMap: Map<string, Outcome>;
}

export function PortfolioHeader({ positions, outcomeMap }: PortfolioHeaderProps) {
  const { data: balanceData } = useUsdcBalance();
  const { t } = useTranslation();

  const usdcBalance = balanceData?.usdcBalance ?? 0;
  const lockedUsdc = (balanceData as { lockedUsdc?: number } | undefined)?.lockedUsdc ?? 0;
  const availableUsdc = Math.max(0, usdcBalance - lockedUsdc);

  // Portfolio value = total USDC balance + position values
  const positionValue = positions.reduce((sum, pos) => {
    const outcome = outcomeMap.get(pos.outcomeId);
    const price = outcome?.price ?? 0;
    return sum + pos.quantity * price;
  }, 0);

  const totalValue = usdcBalance / 1_000_000 + positionValue / 1_000_000;
  const availableDisplay = (availableUsdc / 1_000_000).toFixed(2);

  return (
    <div className="bg-hex-card rounded-xl p-6 border border-hex-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-theme-secondary">{t('portfolio.title')}</span>
        <div className="text-right">
          <span className="text-xs text-theme-tertiary">{t('portfolio.availableToTrade')}</span>
          <p className="text-xl font-bold text-theme-primary">${availableDisplay}</p>
        </div>
      </div>
      <p className="text-3xl font-bold text-theme-primary mb-1">
        ${totalValue.toFixed(2)}
      </p>
      <p className="text-xs text-theme-tertiary mb-5">
        $0.00 (0%) {t('portfolio.pastDay')}
      </p>
      <div className="flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 bg-hex-blue hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          {t('portfolio.deposit')}
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 bg-hex-card border border-hex-border text-theme-primary font-semibold py-3 rounded-lg hover:bg-hex-overlay/5 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {t('portfolio.withdraw')}
        </button>
      </div>
    </div>
  );
}
