'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { useChartData } from '@/hooks/useChartData';
import { useThemeStore } from '@/stores/themeStore';

interface PriceChartProps {
  outcomeId: string;
}

const TIME_RANGES = [
  { label: '1H', hours: 1 },
  { label: '24H', hours: 24 },
  { label: '1W', hours: 168 },
  { label: '1M', hours: 720 },
  { label: 'ALL', hours: 0 },
] as const;

function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    grid: style.getPropertyValue('--hex-chart-grid').trim() || 'rgba(255,255,255,0.05)',
    text: style.getPropertyValue('--hex-chart-text').trim() || '#9ca3af',
  };
}

export function PriceChart({ outcomeId }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [range, setRange] = useState(1); // default 24H
  const resolved = useThemeStore((s) => s.resolved);

  const selectedRange = TIME_RANGES[range];
  const from = useMemo(() => {
    if (!selectedRange.hours) return undefined;
    const BUCKET = 60 * 1000; // 1-min bucket
    const now = Math.floor(Date.now() / BUCKET) * BUCKET;
    return new Date(now - selectedRange.hours * 3600 * 1000).toISOString();
  }, [selectedRange.hours, range]);

  const { data: chartData } = useChartData(outcomeId, { from, limit: 500 });

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
        autoScale: false,
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

    const series = chart.addAreaSeries({
      lineColor: '#3b82f6',
      topColor: 'rgba(59, 130, 246, 0.3)',
      bottomColor: 'rgba(59, 130, 246, 0.0)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (p: number) => `${(p * 100).toFixed(0)}%`,
      },
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: 0, maxValue: 1 },
      }),
    });

    chartRef.current = chart;
    seriesRef.current = series;

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
      seriesRef.current = null;
    };
  }, []);

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

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !chartData?.length) return;
    seriesRef.current.setData(chartData as any);
    chartRef.current?.timeScale().fitContent();
  }, [chartData]);

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
    </div>
  );
}
