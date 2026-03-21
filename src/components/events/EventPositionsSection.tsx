'use client';

import { usePortfolioPositions } from '@/hooks/usePortfolioPositions';
import { useAllOpenOrders } from '@/hooks/useAllOpenOrders';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import type { Outcome } from '@hexmarket/sdk';

interface EventPositionsSectionProps {
  outcomes: Outcome[];
  onSell?: (outcomeId: string, quantity: number) => void;
  bare?: boolean;
}

export function EventPositionsSection({ outcomes, onSell, bare }: EventPositionsSectionProps) {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { data: positions, isLoading } = usePortfolioPositions();
  const { data: allOrders } = useAllOpenOrders();
  const { t, locale } = useTranslation();

  if (!publicKeyBase58 || isLoading) return null;

  const outcomeIds = new Set(outcomes.map((o) => o.id));

  // Compute locked quantity per outcome from open sell orders
  const lockedByOutcome = new Map<string, number>();
  for (const order of allOrders ?? []) {
    if (order.side === 'sell' && outcomeIds.has(order.outcomeId)) {
      lockedByOutcome.set(
        order.outcomeId,
        (lockedByOutcome.get(order.outcomeId) ?? 0) + order.remainingQuantity,
      );
    }
  }
  const eventPositions = (positions ?? []).filter(
    (p) => outcomeIds.has(p.outcomeId) && p.quantity > 0,
  );

  if (eventPositions.length === 0) return null;

  return (
    <div className={bare ? '' : 'bg-hex-card rounded-xl border border-hex-border'}>
      {!bare && (
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="font-semibold">{t('portfolio.positions')}</h3>
          <button className="text-sm text-theme-secondary border border-hex-border rounded-lg px-3 py-1.5 hover:text-theme-primary transition">
            {t('eventDetail.viewNetPositions')}
          </button>
        </div>
      )}
      <div className={bare ? 'overflow-x-auto' : 'px-5 pb-4 overflow-x-auto'}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-theme-tertiary border-b border-hex-border">
              <th className="text-left py-2 font-medium">{t('positions.outcome')}</th>
              <th className="text-right py-2 font-medium">{t('portfolio.quantity')}</th>
              <th className="text-right py-2 font-medium">{t('portfolio.avgPrice')}</th>
              <th className="text-right py-2 font-medium">{t('portfolio.value')}</th>
              <th className="text-right py-2 font-medium">{t('positions.pnl')}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {eventPositions.map((pos) => {
              const outcome = outcomes.find((o) => o.id === pos.outcomeId);
              const label = outcome
                ? translateDynamic(outcome.label, outcome.labelTranslations, locale)
                : '';
              const currentPrice = outcome?.price ?? 0;
              const avgPrice = pos.avgPrice ?? 0;
              const value = currentPrice * pos.quantity;
              const cost = avgPrice * pos.quantity;
              const pnl = value - cost;
              const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

              return (
                <tr key={pos.id} className="border-b border-hex-border/50">
                  <td className="py-3">
                    <span className="bg-hex-green/10 text-hex-green text-xs font-semibold px-2 py-0.5 rounded">
                      {label}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-theme-primary">
                    {pos.quantity}
                  </td>
                  <td className="py-3 text-right font-mono text-theme-secondary">
                    {(avgPrice * 100).toFixed(1)}¢
                  </td>
                  <td className="py-3 text-right">
                    <div className="font-mono font-medium text-theme-primary">
                      ${value.toFixed(2)}
                    </div>
                    <div className="text-xs text-theme-tertiary">
                      {t('trading.cost')} ${cost.toFixed(2)}
                    </div>
                  </td>
                  <td
                    className={`py-3 text-right font-mono ${
                      pnl >= 0 ? 'text-hex-green' : 'text-hex-red'
                    }`}
                  >
                    {pnl >= 0 ? '' : '-'}${Math.abs(pnl).toFixed(2)} (
                    {Math.abs(pnlPct).toFixed(2)}%)
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {onSell && (() => {
                        const locked = lockedByOutcome.get(pos.outcomeId) ?? 0;
                        const available = pos.quantity - locked;
                        return available > 0 ? (
                          <button
                            type="button"
                            onClick={() => onSell(pos.outcomeId, available)}
                            className="border border-hex-border rounded-lg px-3 py-1 text-sm text-theme-primary hover:bg-hex-overlay/5 transition"
                          >
                            {t('trading.sell')}
                          </button>
                        ) : null;
                      })()}
                      <button
                        type="button"
                        className="text-theme-tertiary hover:text-theme-primary transition p-1"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
