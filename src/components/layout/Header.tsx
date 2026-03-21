'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@/components/auth/ConnectButton';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { HexLogo } from '@/components/ui/HexLogo';
import { useTags } from '@/hooks/useTags';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';

export function Header() {
  const pathname = usePathname();
  const { data: tags } = useTags();
  const { t, locale } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded-full text-sm transition ${
      isActive(href)
        ? 'bg-hex-blue/20 text-hex-blue font-medium'
        : 'text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/5'
    }`;

  // Hide header on mobile for market detail pages
  const isMarketDetail = /^\/events\/[^/]+\/market\/[^/]+$/.test(pathname);

  return (
    <header className={`border-b border-hex-border sticky top-0 z-50 bg-hex-dark/80 backdrop-blur-md${isMarketDetail ? ' hidden lg:block' : ''}`}>
      {/* Main nav bar */}
      <div className="container mx-auto px-4 h-14 flex items-center gap-3">
        {/* Mobile: hamburger menu button */}
        <div className="relative md:hidden" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/5 transition"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </svg>
            )}
          </button>

          {/* Mobile dropdown menu */}
          {menuOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-hex-card border border-hex-border rounded-lg shadow-lg z-50 py-1">
              <Link
                href="/portfolio"
                className="block px-4 py-2.5 text-sm text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/5 transition"
              >
                {t('nav.portfolio')}
              </Link>
              <div className="border-t border-hex-border my-1" />
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-theme-tertiary">{t('common.language')}</span>
                <LanguageSelector />
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-theme-tertiary">{t('common.theme')}</span>
                <ThemeToggle />
              </div>
            </div>
          )}
        </div>

        {/* Desktop: logo */}
        <Link href="/" className="shrink-0 hidden md:block">
          <HexLogo size={28} />
        </Link>

        {/* Desktop: spacer */}
        <div className="hidden md:block flex-1" />

        {/* Desktop: right side utilities */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link href="/portfolio" className={linkClass('/portfolio')}>
            {t('nav.portfolio')}
          </Link>
          <LanguageSelector />
          <ThemeToggle />
        </div>

        {/* Mobile: wordmark only */}
        <Link href="/" className="shrink-0 md:hidden">
          <HexLogo size={28} wordmarkOnly />
        </Link>

        {/* Spacer to push connect button right on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Connect button — always visible */}
        <div className="shrink-0">
          <ConnectButton />
        </div>
      </div>

      {/* Tags row — separate scrollable line */}
      {tags && tags.length > 0 && (
        <div className="border-t border-hex-border/50 overflow-x-auto scrollbar-hide">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-1 py-2 whitespace-nowrap">
              <Link href="/" className={linkClass('/')}>
                {t('nav.trending')}
              </Link>
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/category/${tag.slug}`}
                  className={linkClass(`/category/${tag.slug}`)}
                >
                  {translateDynamic(tag.label, tag.labelTranslations, locale)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
