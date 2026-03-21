'use client';

import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useApiCreds } from '@/components/providers/ApiCredentialsProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { OrdersApi, buildL2Headers } from '@hexmarket/sdk';
import { useTranslation } from '@/hooks/useTranslation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const ordersApi = new OrdersApi(API_URL);

export function OpenOrders({ outcomeId }: { outcomeId: string }) {
  const { publicKey, publicKeyBase58 } = useUnifiedWallet();
  const { credentials } = useApiCreds();
  const { data: orders, isLoading } = useOpenOrders(outcomeId);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      if (!credentials || !publicKeyBase58) throw new Error('API credentials not ready');
      const path = `/api/v1/orders/${orderId}`;
      const l2Headers = await buildL2Headers(credentials, publicKeyBase58, 'DELETE', path);
      ordersApi.setL2Headers(l2Headers);
      await ordersApi.cancel(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openOrders', outcomeId] });
    },
  });

  if (!publicKey) return null;

  if (isLoading) {
    return <p className="text-theme-tertiary text-sm">{t('common.loadingOrders')}</p>;
  }

  if (!orders || orders.length === 0) {
    return <p className="text-theme-tertiary text-sm">{t('orders.noOpenOrders')}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 text-xs text-theme-tertiary gap-2">
        <span>{t('orders.side')}</span>
        <span>{t('orders.price')}</span>
        <span>{t('orders.qty')}</span>
        <span>{t('orders.filled')}</span>
        <span>{t('orders.status')}</span>
        <span></span>
      </div>
      {orders.map((order) => (
        <div key={order.id} className="grid grid-cols-6 text-sm font-mono gap-2 items-center">
          <span className={order.side === 'buy' ? 'text-hex-green' : 'text-hex-red'}>
            {order.side.toUpperCase()}
          </span>
          <span>{(order.price * 100).toFixed(0)}¢</span>
          <span>{order.quantity}</span>
          <span>{order.filledQuantity}</span>
          <span className="text-theme-secondary">{order.status}</span>
          <button
            onClick={() => cancelOrder.mutate(order.id)}
            disabled={cancelOrder.isPending}
            className="text-xs text-red-400 hover:text-red-300 disabled:text-gray-600"
          >
            {t('orders.cancel')}
          </button>
        </div>
      ))}
    </div>
  );
}
