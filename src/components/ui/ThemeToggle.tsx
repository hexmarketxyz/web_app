'use client';

import { useThemeStore, type ThemeMode } from '@/stores/themeStore';
import { useTranslation } from '@/hooks/useTranslation';

const cycle: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'auto',
  auto: 'dark',
};

const icons: Record<ThemeMode, string> = {
  light: '\u2600\uFE0F',
  dark: '\uD83C\uDF19',
  auto: '\uD83D\uDD04',
};

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { t } = useTranslation();

  const labelMap: Record<ThemeMode, string> = {
    light: t('theme.light'),
    dark: t('theme.dark'),
    auto: t('theme.auto'),
  };

  return (
    <button
      onClick={() => setMode(cycle[mode])}
      className="px-2 py-1.5 rounded-lg text-xs text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/5 transition"
      title={`Theme: ${labelMap[mode]}`}
    >
      <span className="mr-1">{icons[mode]}</span>
      {labelMap[mode]}
    </button>
  );
}
