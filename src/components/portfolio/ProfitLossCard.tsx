'use client';

import { useTranslation } from '@/hooks/useTranslation';
import type { Position } from '@/hooks/usePortfolioPositions';

interface ProfitLossCardProps {
  positions: Position[];
}

export function ProfitLossCard({ positions }: ProfitLossCardProps) {
  const { t } = useTranslation();

  const totalPnl = positions.reduce((sum, pos) => sum + pos.realizedPnl, 0);
  const pnlDisplay = (totalPnl / 1_000_000).toFixed(2);
  const isPositive = totalPnl >= 0;

  return (
    <div className="bg-hex-card rounded-xl p-6 border border-hex-border">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPositive ? 'bg-hex-green' : 'bg-hex-red'}`} />
          <span className="text-sm text-theme-secondary">{t('portfolio.profitLoss')}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <button className="px-2 py-0.5 text-theme-tertiary hover:text-theme-primary transition">1D</button>
          <button className="px-2 py-0.5 text-theme-tertiary hover:text-theme-primary transition">1W</button>
          <button className="px-2 py-0.5 bg-hex-blue/10 text-hex-blue rounded-full">1M</button>
          <button className="px-2 py-0.5 text-theme-tertiary hover:text-theme-primary transition">ALL</button>
        </div>
      </div>
      <p className={`text-3xl font-bold mb-1 ${isPositive ? 'text-theme-primary' : 'text-hex-red'}`}>
        ${pnlDisplay}
      </p>
      <p className="text-xs text-theme-tertiary mb-4">{t('portfolio.pastMonth')}</p>
      {/* Simplified P&L bar */}
      <div className="h-8 bg-gradient-to-r from-hex-blue/20 to-transparent rounded" />
    </div>
  );
}
