'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const resolved = useThemeStore((s) => s.resolved);

  // Apply data-theme on mount and when resolved changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  // Auto-mode: re-evaluate every 60s for day/night boundary
  useEffect(() => {
    if (mode !== 'auto') return;
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const newResolved = hour >= 6 && hour < 18 ? 'light' : 'dark';
      const current = useThemeStore.getState().resolved;
      if (newResolved !== current) {
        document.documentElement.setAttribute('data-theme', newResolved);
        useThemeStore.setState({ resolved: newResolved });
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [mode]);

  return <>{children}</>;
}
