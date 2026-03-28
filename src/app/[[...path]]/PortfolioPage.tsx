'use client';

import { useState, useMemo } from 'react';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useTranslation } from '@/hooks/useTranslation';
import { usePortfolioPositions } from '@/hooks/usePortfolioPositions';
import { useAllOpenOrders } from '@/hooks/useAllOpenOrders';
import { useUserTrades } from '@/hooks/useUserTrades';
import { useOutcomeDetails } from '@/hooks/useOutcomeDetails';
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader';
import { ProfitLossCard } from '@/components/portfolio/ProfitLossCard';
import { PositionsTable } from '@/components/portfolio/PositionsTable';
import { OpenOrdersTable } from '@/components/portfolio/OpenOrdersTable';
import { TradeHistoryTable } from '@/components/portfolio/TradeHistoryTable';

type Tab = 'positions' | 'orders' | 'history';

export default function PortfolioPage() {
  const { publicKey } = useUnifiedWallet();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('positions');

  const { data: positions = [], isLoading: positionsLoading } = usePortfolioPositions();
  const { data: openOrders = [], isLoading: ordersLoading } = useAllOpenOrders();
  const { data: trades = [], isLoading: tradesLoading } = useUserTrades();

  // Collect all unique outcome IDs from positions, orders, and trades
  const allOutcomeIds = useMemo(() => {
    const ids = new Set<string>();
    positions.forEach((p) => ids.add(p.outcomeId));
    openOrders.forEach((o) => ids.add(o.outcomeId));
    trades.forEach((tr) => ids.add(tr.outcomeId));
    return [...ids];
  }, [positions, openOrders, trades]);

  const { outcomeMap, eventSlugMap, eventContextMap, isLoading: outcomesLoading } = useOutcomeDetails(allOutcomeIds);

  if (!publicKey) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">{t('portfolio.title')}</h1>
        <p className="text-theme-secondary">{t('auth.signInPortfolio')}</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'positions', label: t('portfolio.positions') },
    { key: 'orders', label: t('portfolio.openOrders') },
    { key: 'history', label: t('portfolio.history') },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <PortfolioHeader positions={positions} outcomeMap={outcomeMap} />
        <ProfitLossCard positions={positions} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-hex-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'text-theme-primary border-b-2 border-theme-primary'
                : 'text-theme-tertiary hover:text-theme-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'positions' && (
        <PositionsTable
          positions={positions}
          outcomeMap={outcomeMap}
          eventSlugMap={eventSlugMap}
          eventContextMap={eventContextMap}
          isLoading={positionsLoading || outcomesLoading}
        />
      )}
      {activeTab === 'orders' && (
        <OpenOrdersTable
          orders={openOrders}
          outcomeMap={outcomeMap}
          eventSlugMap={eventSlugMap}
          eventContextMap={eventContextMap}
          isLoading={ordersLoading || outcomesLoading}
        />
      )}
      {activeTab === 'history' && (
        <TradeHistoryTable
          trades={trades}
          outcomeMap={outcomeMap}
          eventSlugMap={eventSlugMap}
          eventContextMap={eventContextMap}
          isLoading={tradesLoading || outcomesLoading}
        />
      )}
    </div>
  );
}
