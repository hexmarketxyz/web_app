'use client';

import { useState, useMemo } from 'react';
/* eslint-disable @next/next/no-img-element */
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { getMarketDisplayName } from './getMarketDisplayName';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import type { UserTrade } from '@/hooks/useUserTrades';
import type { OutcomeEventContext } from '@/hooks/useOutcomeDetails';
import type { Outcome } from '@hexmarket/sdk';

import { imageUrl } from '@/lib/imageUrl';

interface TradeHistoryTableProps {
  trades: UserTrade[];
  outcomeMap: Map<string, Outcome>;
  eventSlugMap: Map<string, string>;
  eventContextMap: Map<string, OutcomeEventContext>;
  isLoading: boolean;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

type FilterMode = 'all' | 'newest';

const SOLANA_EXPLORER_URL = process.env.NEXT_PUBLIC_SOLANA_EXPLORER_URL || 'https://explorer.solana.com';
const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet';

function getTxExplorerUrl(txSignature: string): string {
  return `${SOLANA_EXPLORER_URL}/tx/${txSignature}?cluster=${SOLANA_CLUSTER}`;
}

export function TradeHistoryTable({ trades, outcomeMap, eventSlugMap, eventContextMap, isLoading }: TradeHistoryTableProps) {
  const { t, locale } = useTranslation();
  const { publicKeyBase58 } = useUnifiedWallet();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const filtered = useMemo(() => {
    let result = trades;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((trade) => {
        const outcome = outcomeMap.get(trade.outcomeId);
        const displayName = getMarketDisplayName(trade.outcomeId, outcome, eventContextMap, locale);
        return displayName.toLowerCase().includes(q);
      });
    }
    if (filter === 'newest') {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [trades, search, filter, outcomeMap, eventContextMap, locale]);

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
        <div className="flex gap-2">
          {(['all', 'newest'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                filter === mode
                  ? 'bg-hex-card border border-hex-border text-theme-primary'
                  : 'text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              {mode === 'all' ? t('common.all') : t('portfolio.newest')}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-theme-tertiary uppercase border-b border-hex-border">
              <th className="text-left py-3 font-medium">{t('portfolio.activity')}</th>
              <th className="text-left py-3 font-medium">{t('portfolio.market')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.avgPrice')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.quantity')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.amount')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.time')}</th>
              <th className="text-right py-3 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-theme-tertiary">
                  {t('portfolio.noTrades')}
                </td>
              </tr>
            ) : (
              filtered.map((trade) => {
                const outcome = outcomeMap.get(trade.outcomeId);
                const slug = eventSlugMap.get(trade.outcomeId);
                const ctx = eventContextMap.get(trade.outcomeId);
                const displayName = getMarketDisplayName(trade.outcomeId, outcome, eventContextMap, locale);
                const label = outcome ? translateDynamic(outcome.label, outcome.labelTranslations, locale) : '';
                const price = Number(trade.price);
                const amount = price * trade.quantity;
                const href = slug ? `/events/${slug}` : '#';
                const iconUrl = ctx?.marketIconUrl ?? ctx?.eventIconUrl;

                // Determine if user bought or sold from their perspective
                const isMaker = trade.makerPubkey === publicKeyBase58;
                const isSelfTrade = trade.makerPubkey === trade.takerPubkey;
                // Self-trade (cross-outcome synthetic): side is as reported.
                // For the taker, the trade side is as reported.
                // For the maker, the side is the opposite.
                const userSide = isSelfTrade
                  ? trade.side
                  : isMaker
                    ? (trade.side === 'buy' ? 'sell' : 'buy')
                    : trade.side;
                const isBuy = userSide === 'buy';

                return (
                  <tr key={trade.id} className="border-b border-hex-border/50 hover:bg-hex-overlay/5 transition">
                    <td className="py-3">
                      <span className={`text-xs font-semibold ${isBuy ? 'text-hex-green' : 'text-hex-red'}`}>
                        {isBuy ? t('portfolio.bought') : t('portfolio.sold')}
                      </span>
                      <span className="text-theme-secondary ml-1.5">{label}</span>
                    </td>
                    <td className="py-3">
                      <a href={href} className="flex items-center gap-3 hover:text-hex-blue transition">
                        {iconUrl && (
                          <img
                            src={imageUrl(iconUrl)}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <p className="text-theme-primary truncate max-w-xs">{displayName}</p>
                      </a>
                    </td>
                    <td className="py-3 text-right font-mono text-theme-secondary">
                      {(price * 100).toFixed(1)}¢
                    </td>
                    <td className="py-3 text-right font-mono text-theme-secondary">
                      {trade.quantity.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono text-theme-secondary">
                      ${amount.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-theme-tertiary text-xs">
                      {timeAgo(trade.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      {trade.settlementTx ? (
                        <a
                          href={getTxExplorerUrl(trade.settlementTx)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-hex-blue hover:text-blue-400 transition"
                          title={trade.settlementTx}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-theme-tertiary text-xs">-</span>
                      )}
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
