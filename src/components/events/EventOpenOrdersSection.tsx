'use client';

import { useAllOpenOrders } from '@/hooks/useAllOpenOrders';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useCancelOrder } from '@/hooks/useCancelOrder';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import type { Outcome } from '@hexmarket/sdk';

interface EventOpenOrdersSectionProps {
  outcomes: Outcome[];
  bare?: boolean;
}

export function EventOpenOrdersSection({ outcomes, bare }: EventOpenOrdersSectionProps) {
  const { publicKeyBase58 } = useUnifiedWallet();
  const { data: allOrders, isLoading } = useAllOpenOrders();
  const cancelOrder = useCancelOrder();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();

  if (!publicKeyBase58 || isLoading) return null;

  const outcomeIds = new Set(outcomes.map((o) => o.id));
  const eventOrders = (allOrders ?? []).filter((o) => outcomeIds.has(o.outcomeId));

  if (eventOrders.length === 0) return null;

  const handleCancel = (orderId: string) => {
    cancelOrder.mutate(orderId, {
      onSuccess: () => {
        showToast({
          type: 'success',
          title: t('toast.cancelled'),
        });
      },
    });
  };

  const handleCancelAll = () => {
    eventOrders.forEach((order) => {
      cancelOrder.mutate(order.id);
    });
  };

  return (
    <div className={bare ? '' : 'bg-hex-card rounded-xl border border-hex-border'}>
      {!bare && (
        <div className="px-5 py-4">
          <h3 className="font-semibold">{t('portfolio.openOrders')}</h3>
        </div>
      )}
      <div className={bare ? 'overflow-x-auto' : 'px-5 pb-4 overflow-x-auto'}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-theme-tertiary uppercase border-b border-hex-border">
              <th className="text-left py-2 font-medium">{t('orders.side')}</th>
              <th className="text-left py-2 font-medium">{t('positions.outcome')}</th>
              <th className="text-right py-2 font-medium">{t('orders.price')}</th>
              <th className="text-right py-2 font-medium">{t('orders.filled')}</th>
              <th className="text-right py-2 font-medium">{t('portfolio.total')}</th>
              <th className="text-right py-2 font-medium">{t('portfolio.expiration')}</th>
              <th className="text-right py-2 font-medium">
                <button
                  type="button"
                  onClick={handleCancelAll}
                  className="text-hex-red hover:text-red-300 text-xs font-medium uppercase transition"
                >
                  {t('eventDetail.cancelAll')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {eventOrders.map((order) => {
              const outcome = outcomes.find((o) => o.id === order.outcomeId);
              const label = outcome
                ? translateDynamic(outcome.label, outcome.labelTranslations, locale)
                : '';
              const total = order.price * order.quantity;

              return (
                <tr key={order.id} className="border-b border-hex-border/50">
                  <td className="py-3 capitalize">
                    {order.side === 'buy' ? t('trading.buy') : t('trading.sell')}
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        order.side === 'buy'
                          ? 'bg-hex-green/10 text-hex-green'
                          : 'bg-hex-red/10 text-hex-red'
                      }`}
                    >
                      {label}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-theme-secondary">
                    {(order.price * 100).toFixed(0)}¢
                  </td>
                  <td className="py-3 text-right font-mono text-theme-secondary">
                    {order.filledQuantity} / {order.quantity}
                  </td>
                  <td className="py-3 text-right font-mono text-theme-secondary">
                    ${total.toFixed(2)}
                  </td>
                  <td className="py-3 text-right text-theme-tertiary text-xs">
                    {t('eventDetail.goodTilCancel')}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleCancel(order.id)}
                      disabled={cancelOrder.isPending}
                      className="text-theme-tertiary hover:text-theme-primary transition"
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
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
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
