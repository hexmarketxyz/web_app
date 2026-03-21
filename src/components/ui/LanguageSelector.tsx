'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocaleStore } from '@/stores/localeStore';
import { LOCALES, type Locale } from '@/i18n/config';

export function LanguageSelector() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = LOCALES.find((l) => l.code === locale)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1.5 rounded-lg text-xs text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/5 transition"
      >
        {current.name}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-hex-card border border-hex-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code as Locale);
                setOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 text-sm transition ${
                locale === l.code
                  ? 'text-hex-blue bg-hex-blue/10'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/5'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
