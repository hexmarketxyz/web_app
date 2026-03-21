'use client';

import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useClosedOrders } from '@/hooks/useClosedOrders';
import { useTranslation } from '@/hooks/useTranslation';

const statusColors: Record<string, string> = {
  filled: 'text-hex-green',
  cancelled: 'text-theme-tertiary',
  expired: 'text-yellow-500',
  rejected: 'text-hex-red',
};

export function ClosedOrders({ outcomeId }: { outcomeId: string }) {
  const { publicKey } = useUnifiedWallet();
  const { data: orders, isLoading } = useClosedOrders(outcomeId);
  const { t } = useTranslation();

  if (!publicKey) return null;

  if (isLoading) {
    return <p className="text-theme-tertiary text-sm">{t('common.loadingOrderHistory')}</p>;
  }

  if (!orders || orders.length === 0) {
    return <p className="text-theme-tertiary text-sm">{t('orders.noOrderHistory')}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 text-xs text-theme-tertiary gap-2">
        <span>{t('orders.side')}</span>
        <span>{t('orders.price')}</span>
        <span>{t('orders.qty')}</span>
        <span>{t('orders.filled')}</span>
        <span>{t('orders.status')}</span>
      </div>
      {orders.map((order) => (
        <div
          key={order.id}
          className="grid grid-cols-5 text-sm font-mono gap-2 items-center"
        >
          <span
            className={
              order.side === 'buy' ? 'text-hex-green' : 'text-hex-red'
            }
          >
            {order.side.toUpperCase()}
          </span>
          <span>{(order.price * 100).toFixed(0)}¢</span>
          <span>{order.quantity}</span>
          <span>{order.filledQuantity}</span>
          <span className={statusColors[order.status] ?? 'text-theme-secondary'}>
            {order.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
