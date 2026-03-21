'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { useThemeStore } from '@/stores/themeStore';
import type { Trade } from '@hexmarket/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
  const [range, setRange] = useState(1); // index into TIME_RANGES (default 24H)
  const resolved = useThemeStore((s) => s.resolved);

  const selectedRange = TIME_RANGES[range];
  // Round `from` to the nearest 5-minute bucket so the query key stays stable
  // across re-renders, preventing redundant API requests.
  const from = useMemo(() => {
    if (!selectedRange.hours) return undefined;
    const BUCKET = 5 * 60 * 1000;
    const now = Math.floor(Date.now() / BUCKET) * BUCKET;
    return new Date(now - selectedRange.hours * 3600 * 1000).toISOString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange.hours, range]);

  const { data: snapshots } = usePriceHistory(outcomeId, { from, limit: 500 });

  // Fetch trades for this outcome to supplement chart data
  const { data: trades } = useQuery<Trade[]>({
    queryKey: ['outcomeTrades', outcomeId, 500],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/trades?outcome_id=${outcomeId}&limit=500`,
      );
      if (!res.ok) throw new Error('Failed to fetch trades');
      return res.json();
    },
    enabled: !!outcomeId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Merge snapshots + trades into chart data, deduplicating by timestamp
  const chartData = useMemo(() => {
    const pointMap = new Map<number, number>();

    // Add snapshot data points
    if (snapshots?.length) {
      for (const s of snapshots) {
        const t = Math.floor(new Date(s.capturedAt).getTime() / 1000);
        if (s.price != null) pointMap.set(t, Number(s.price));
      }
    }

    // Add trade data points (trades provide more granular data)
    if (trades?.length) {
      const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : 0;
      for (const trade of trades) {
        const t = Math.floor(new Date(trade.createdAt).getTime() / 1000);
        if (t >= fromTs) {
          // If same second exists, trade price takes precedence
          pointMap.set(t, Number(trade.price));
        }
      }
    }

    if (pointMap.size === 0) return [];

    return Array.from(pointMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({ time: time as any, value }));
  }, [snapshots, trades, from]);

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
        scaleMargins: { top: 0.1, bottom: 0.1 },
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
        formatter: (p: number) => `${(p * 100).toFixed(0)}¢`,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
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

  // Re-apply theme colors when theme changes
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
    if (!seriesRef.current || !chartData.length) return;

    seriesRef.current.setData(chartData);
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
