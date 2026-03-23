'use client';

import { useState, useMemo } from 'react';
/* eslint-disable @next/next/no-img-element */
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import { getMarketDisplayName } from './getMarketDisplayName';
import type { Position } from '@/hooks/usePortfolioPositions';
import type { OutcomeEventContext } from '@/hooks/useOutcomeDetails';
import type { Outcome } from '@hexmarket/sdk';

import { imageUrl } from '@/lib/imageUrl';

interface PositionsTableProps {
  positions: Position[];
  outcomeMap: Map<string, Outcome>;
  eventSlugMap: Map<string, string>;
  eventContextMap: Map<string, OutcomeEventContext>;
  isLoading: boolean;
}

type SortKey = 'market' | 'value';
type SortDir = 'asc' | 'desc';

export function PositionsTable({ positions, outcomeMap, eventSlugMap, eventContextMap, isLoading }: PositionsTableProps) {
  const { t, locale } = useTranslation();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filter positions with quantity > 0
  const activePositions = useMemo(() => {
    return positions.filter((p) => p.quantity > 0);
  }, [positions]);

  const filtered = useMemo(() => {
    if (!search) return activePositions;
    const q = search.toLowerCase();
    return activePositions.filter((pos) => {
      const outcome = outcomeMap.get(pos.outcomeId);
      const displayName = getMarketDisplayName(pos.outcomeId, outcome, eventContextMap, locale);
      return displayName.toLowerCase().includes(q);
    });
  }, [activePositions, search, outcomeMap, eventContextMap, locale]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'value') {
        const aPrice = outcomeMap.get(a.outcomeId)?.price ?? 0;
        const bPrice = outcomeMap.get(b.outcomeId)?.price ?? 0;
        cmp = a.quantity * aPrice - b.quantity * bPrice;
      } else {
        const aQ = outcomeMap.get(a.outcomeId)?.question ?? '';
        const bQ = outcomeMap.get(b.outcomeId)?.question ?? '';
        cmp = aQ.localeCompare(bQ);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filtered, sortKey, sortDir, outcomeMap]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

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
        <button
          onClick={() => toggleSort('value')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-hex-card border border-hex-border rounded-lg text-sm text-theme-primary hover:border-hex-blue transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          {t('portfolio.currentValue')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-theme-tertiary uppercase border-b border-hex-border">
              <th className="text-left py-3 font-medium cursor-pointer" onClick={() => toggleSort('market')}>
                {t('portfolio.market')} {sortKey === 'market' ? (sortDir === 'desc' ? '↓' : '↑') : '◇'}
              </th>
              <th className="text-right py-3 font-medium">{t('portfolio.avgToNow')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.traded')}</th>
              <th className="text-right py-3 font-medium">{t('portfolio.toWin')}</th>
              <th className="text-right py-3 font-medium cursor-pointer" onClick={() => toggleSort('value')}>
                {t('portfolio.value')} {sortKey === 'value' ? (sortDir === 'desc' ? '↓' : '↑') : '◇'}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-theme-tertiary">
                  {t('portfolio.noPositions')}
                </td>
              </tr>
            ) : (
              sorted.map((pos) => {
                const outcome = outcomeMap.get(pos.outcomeId);
                const slug = eventSlugMap.get(pos.outcomeId);
                const ctx = eventContextMap.get(pos.outcomeId);
                const displayName = getMarketDisplayName(pos.outcomeId, outcome, eventContextMap, locale);
                const label = outcome ? translateDynamic(outcome.label, outcome.labelTranslations, locale) : '';
                const currentPrice = outcome?.price ?? 0;
                const avgPrice = pos.avgPrice ?? 0;
                const traded = avgPrice * pos.quantity;
                const toWin = pos.quantity;
                const value = currentPrice * pos.quantity;
                const href = slug ? `/events/${slug}` : '#';
                const iconUrl = ctx?.marketIconUrl ?? ctx?.eventIconUrl;

                return (
                  <tr key={pos.id} className="border-b border-hex-border/50 hover:bg-hex-overlay/5 transition">
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
                          <p className="font-medium text-theme-primary truncate max-w-xs">{displayName}</p>
                          <p className="text-xs text-theme-tertiary">{label}</p>
                        </div>
                      </a>
                    </td>
                    <td className="py-3 text-right font-mono">
                      <span className="text-theme-tertiary">{(avgPrice * 100).toFixed(0)}¢</span>
                      <span className="text-theme-tertiary mx-1">→</span>
                      <span className={currentPrice >= avgPrice ? 'text-hex-green' : 'text-hex-red'}>
                        {(currentPrice * 100).toFixed(0)}¢
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-theme-secondary">
                      ${traded.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono text-theme-secondary">
                      {toWin.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-theme-primary">
                      ${value.toFixed(2)}
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
