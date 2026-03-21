import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

function resolveAutoTheme(): ResolvedTheme {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('hex-theme') as ThemeMode) || 'dark';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') return resolveAutoTheme();
  return mode;
}

export const useThemeStore = create<ThemeState>((set) => {
  const mode = getInitialMode();
  return {
    mode,
    resolved: resolveTheme(mode),
    setMode: (mode) => {
      localStorage.setItem('hex-theme', mode);
      const resolved = resolveTheme(mode);
      document.documentElement.setAttribute('data-theme', resolved);
      set({ mode, resolved });
    },
  };
});
