'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { useMultiChartData } from '@/hooks/useChartData';
import { useThemeStore } from '@/stores/themeStore';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import type { MarketDetail } from '@hexmarket/sdk';

interface MultiMarketChartProps {
  markets: MarketDetail[];
}

const TIME_RANGES = [
  { label: '1H', hours: 1 },
  { label: '24H', hours: 24 },
  { label: '1W', hours: 168 },
  { label: '1M', hours: 720 },
  { label: 'ALL', hours: 0 },
] as const;

const LINE_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
];

function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    grid: style.getPropertyValue('--hex-chart-grid').trim() || 'rgba(255,255,255,0.05)',
    text: style.getPropertyValue('--hex-chart-text').trim() || '#9ca3af',
  };
}

export function MultiMarketChart({ markets }: MultiMarketChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const [range, setRange] = useState(1); // default 24H
  const resolved = useThemeStore((s) => s.resolved);
  const { locale } = useTranslation();

  const displayMarkets = useMemo(() => markets.slice(0, 4), [markets]);
  const marketCount = displayMarkets.length;
  const outcomeIds = useMemo(
    () => displayMarkets.map((m) => m.outcomes[0]?.id).filter(Boolean),
    [displayMarkets],
  );

  const selectedRange = TIME_RANGES[range];
  const from = useMemo(() => {
    if (!selectedRange.hours) return undefined;
    const BUCKET = 60 * 1000;
    const now = Math.floor(Date.now() / BUCKET) * BUCKET;
    return new Date(now - selectedRange.hours * 3600 * 1000).toISOString();
  }, [selectedRange.hours, range]);

  // Single batch API call for all outcomes
  const { data: allChartData } = useMultiChartData(outcomeIds, { from, limit: 500 });

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;
    const colors = getChartColors();

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: colors.text,
        fontFamily: 'ui-monospace, monospace',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      crosshair: {
        horzLine: { visible: true, labelVisible: true },
        vertLine: { visible: true, labelVisible: true },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series: ISeriesApi<'Line'>[] = [];
    for (let i = 0; i < marketCount; i++) {
      const s = chart.addLineSeries({
        color: LINE_COLORS[i % LINE_COLORS.length],
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${(p * 100).toFixed(0)}%`,
        },
        autoscaleInfoProvider: () => ({
          priceRange: { minValue: 0, maxValue: 1 },
        }),
      });
      series.push(s);
    }

    chartRef.current = chart;
    seriesRefs.current = series;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = [];
    };
  }, [marketCount]);

  // Re-apply theme colors
  useEffect(() => {
    if (!chartRef.current) return;
    const colors = getChartColors();
    chartRef.current.applyOptions({
      layout: { textColor: colors.text },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
    });
  }, [resolved]);

  // Update chart data
  useEffect(() => {
    if (!chartRef.current || !allChartData) return;

    for (let i = 0; i < displayMarkets.length; i++) {
      const oid = displayMarkets[i].outcomes[0]?.id;
      const data = oid ? allChartData[oid] : undefined;
      const series = seriesRefs.current[i];
      if (data?.length && series) {
        series.setData(data as any);
      }
    }
    chartRef.current.timeScale().fitContent();
  }, [allChartData, displayMarkets]);

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {TIME_RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRange(i)}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              range === i
                ? 'bg-hex-blue/20 text-hex-blue'
                : 'text-theme-tertiary hover:text-theme-primary'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: 300 }}
      />

      {/* Legend */}
      {displayMarkets.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {displayMarkets.map((m, i) => (
            <div key={m.id} className="flex items-center gap-1.5 text-xs text-theme-secondary">
              <span
                className="w-3 h-[2px] rounded-full flex-shrink-0"
                style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
              />
              <span className="truncate max-w-[150px]">
                {translateDynamic(m.title, m.titleTranslations, locale)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
