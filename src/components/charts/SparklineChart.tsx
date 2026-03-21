'use client';

import { useRef, useEffect } from 'react';
import { createChart, type IChartApi, ColorType } from 'lightweight-charts';
import { useSparkline } from '@/hooks/usePriceHistory';

interface SparklineChartProps {
  outcomeId: string;
}

export function SparklineChart({ outcomeId }: SparklineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { data: snapshots } = useSparkline(outcomeId);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: {
        horzLine: { visible: false },
        vertLine: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
    });

    const series = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;

    if (snapshots?.length) {
      const data = snapshots.map((s) => ({
        time: Math.floor(new Date(s.capturedAt).getTime() / 1000) as any,
        value: Number(s.price),
      }));
      series.setData(data);
      chart.timeScale().fitContent();
    }

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [snapshots]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  );
}
