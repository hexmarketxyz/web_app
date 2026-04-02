'use client';

import { useMemo, useRef, useEffect } from 'react';
import type { PriceTick } from '@/hooks/useEvents';

interface AssetPriceChartProps {
  ticks: PriceTick[];
  strikePrice?: number;
  height?: number;
}

/** Simple canvas line chart for asset prices with optional strike price line. */
export function AssetPriceChart({ ticks, strikePrice, height = 240 }: AssetPriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sorted = useMemo(() => {
    return [...ticks].sort((a, b) => a.t - b.t);
  }, [ticks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sorted.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const prices = sorted.map((t) => t.p);
    let minP = Math.min(...prices);
    let maxP = Math.max(...prices);
    if (strikePrice != null) {
      minP = Math.min(minP, strikePrice);
      maxP = Math.max(maxP, strikePrice);
    }
    const range = maxP - minP || 1;
    const padRange = range * 0.05;
    minP -= padRange;
    maxP += padRange;

    const tMin = sorted[0].t;
    const tMax = sorted[sorted.length - 1].t;
    const tRange = tMax - tMin || 1;

    const toX = (t: number) => pad.left + ((t - tMin) / tRange) * chartW;
    const toY = (p: number) => pad.top + (1 - (p - minP) / (maxP - minP)) * chartH;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines + Y labels
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left';
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minP + (i / gridSteps) * (maxP - minP);
      const y = toY(p);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillText(formatPrice(p), w - pad.right + 4, y + 3);
    }

    // Strike price line
    if (strikePrice != null) {
      const sy = toY(strikePrice);
      ctx.strokeStyle = 'rgba(255,165,0,0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, sy);
      ctx.lineTo(w - pad.right, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,165,0,0.8)';
      ctx.fillText(`$${formatPrice(strikePrice)}`, pad.left + 4, sy - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
    }

    // Price line
    const lastPrice = sorted[sorted.length - 1].p;
    const isAboveStrike = strikePrice != null ? lastPrice >= strikePrice : true;
    ctx.strokeStyle = isAboveStrike ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < sorted.length; i++) {
      const x = toX(sorted[i].t);
      const y = toY(sorted[i].p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current price label
    const lastX = toX(tMax);
    const lastY = toY(lastPrice);
    ctx.fillStyle = isAboveStrike ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`$${formatPrice(lastPrice)}`, lastX - 4, lastY - 6);

    // X axis time labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const xSteps = Math.min(6, sorted.length);
    for (let i = 0; i < xSteps; i++) {
      const idx = Math.floor((i / (xSteps - 1)) * (sorted.length - 1));
      const tick = sorted[idx];
      const x = toX(tick.t);
      const d = new Date(tick.t * 1000);
      const label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      ctx.fillText(label, x, h - 6);
    }
  }, [sorted, strikePrice, height]);

  if (sorted.length < 2) {
    return (
      <div className="flex items-center justify-center text-theme-tertiary text-sm" style={{ height }}>
        No price data
      </div>
    );
  }

  return <canvas ref={canvasRef} className="w-full" style={{ height }} />;
}

function formatPrice(p: number): string {
  if (p >= 10000) return p.toFixed(2);
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}
