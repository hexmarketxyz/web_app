import { create } from 'zustand';
import type { Locale } from '@/i18n/config';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem('hex-locale') as Locale) || 'en';
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getInitialLocale(),
  setLocale: (locale) => {
    localStorage.setItem('hex-locale', locale);
    document.documentElement.setAttribute('lang', locale);
    set({ locale });
  },
}));
