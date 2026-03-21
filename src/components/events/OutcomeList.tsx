'use client';

import type { Outcome } from '@hexmarket/sdk';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';

interface OutcomeListProps {
  outcomes: Outcome[];
  selectedId?: string;
  onSelect: (outcomeId: string) => void;
}

export function OutcomeList({
  outcomes,
  selectedId,
  onSelect,
}: OutcomeListProps) {
  const { t, locale } = useTranslation();

  return (
    <div className="space-y-2">
      {outcomes.map((outcome) => {
        const outcomePrice = outcome.price ?? 0.5;
        const isSelected = outcome.id === selectedId;

        return (
          <button
            key={outcome.id}
            onClick={() => onSelect(outcome.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-left ${
              isSelected
                ? 'bg-hex-blue/10 border border-hex-blue'
                : 'bg-hex-dark border border-hex-border hover:border-gray-600'
            }`}
          >
            {/* Label */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {translateDynamic(outcome.label, outcome.labelTranslations, locale) || outcome.question}
              </div>
              <div className="text-xs text-theme-tertiary">
                Vol: ${Math.floor((outcome.totalVolume ?? 0) / 1_000_000)}
              </div>
            </div>

            {/* Sparkline */}
            <div className="w-16 h-8 flex-shrink-0">
              <SparklineChart outcomeId={outcome.id} />
            </div>

            {/* Price / Probability */}
            <div className="text-right flex-shrink-0 w-14">
              <div className="text-lg font-bold font-mono text-hex-green">
                {(outcomePrice * 100).toFixed(0)}¢
              </div>
            </div>

            {/* Buy button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(outcome.id);
              }}
              className="bg-hex-blue/20 text-hex-blue text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-hex-blue/30 transition flex-shrink-0"
            >
              {t('trading.buy')}
            </button>
          </button>
        );
      })}
    </div>
  );
}
