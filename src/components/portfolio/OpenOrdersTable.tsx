'use client';

import { useState, useMemo } from 'react';
/* eslint-disable @next/next/no-img-element */
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { getMarketDisplayName } from './getMarketDisplayName';
import { useCancelOrder } from '@/hooks/useCancelOrder';
import type { OutcomeEventContext } from '@/hooks/useOutcomeDetails';
import type { Order, Outcome } from '@hexmarket/sdk';

import { imageUrl } from '@/lib/imageUrl';

interface OpenOrdersTableProps {
  orders: Order[];
  outcomeMap: Map<string, Outcome>;
  eventSlugMap: Map<string, string>;
  eventContextMap: Map<string, OutcomeEventContext>;
  isLoading: boolean;
}

export function OpenOrdersTable({ orders, outcomeMap, eventSlugMap, eventContextMap, isLoading }: OpenOrdersTableProps) {
  const { t, locale } = useTranslation();
  const cancelOrder = useCancelOrder();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter((order) => {
      const outcome = outcomeMap.get(order.outcomeId);
      const displayName = getMarketDisplayName(order.outcomeId, outcome, eventContextMap, locale);
      return displayName.toLowerCase().includes(q);
    });
  }, [orders, search, outcomeMap, eventContextMap, locale]);

  if (isLoading) {
    return <div className="text-theme-secondary text-sm py-8 text-center">{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('portfolio.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-hex-card border border-hex-border rounded-lg text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:border-hex-blue"
          />
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2.5 bg-hex-card border border-hex-border rounded-lg text-sm text-theme-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          {t('portfolio.market')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-theme-tertiary uppercase border-b border-hex-border">
              <th className="text-left py-3 font-medium">{t('portfolio.market')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.filled')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.total')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.expiration')}</th>
              <th className="text-right py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-theme-tertiary">
                  {t('portfolio.noOpenOrders')}
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const outcome = outcomeMap.get(order.outcomeId);
                const slug = eventSlugMap.get(order.outcomeId);
                const ctx = eventContextMap.get(order.outcomeId);
                const displayName = getMarketDisplayName(order.outcomeId, outcome, eventContextMap, locale);
                const label = outcome ? translateDynamic(outcome.label, outcome.labelTranslations, locale) : '';
                const fillPct = order.quantity > 0 ? ((order.filledQuantity / order.quantity) * 100).toFixed(0) : '0';
                const total = order.price * order.quantity;
                const href = slug ? `/events/${slug}` : '#';
                const iconUrl = ctx?.marketIconUrl ?? ctx?.eventIconUrl;

                return (
                  <tr key={order.id} className="border-b border-hex-border/50 hover:bg-hex-overlay/5 transition">
                    <td className="py-3">
                      <a href={href} className="flex items-center gap-3 hover:text-hex-blue transition">
                        {iconUrl && (
                          <img
                            src={imageUrl(iconUrl)}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${order.side === 'buy' ? 'bg-hex-green/10 text-hex-green' : 'bg-hex-red/10 text-hex-red'}`}>
                              {order.side.toUpperCase()}
                            </span>
                            <span className="font-medium text-theme-primary truncate max-w-xs">{displayName}</span>
                          </div>
                          <p className="text-xs text-theme-tertiary mt-0.5">{label} @ {(order.price * 100).toFixed(0)}¢</p>
                        </div>
                      </a>
                    </td>
                    <td className="py-3 text-right font-mono text-theme-secondary">
                      {order.filledQuantity}/{order.quantity} ({fillPct}%)
                    </td>
                    <td className="py-3 text-right font-mono text-theme-secondary">
                      ${total.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-theme-tertiary text-xs">
                      —
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => cancelOrder.mutate(order.id)}
                        disabled={cancelOrder.isPending}
                        className="text-xs text-hex-red hover:text-red-300 disabled:text-gray-600 transition"
                      >
                        {t('portfolio.cancel')}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
