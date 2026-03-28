'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

declare global {
  interface Window {
    __nativePushState?: typeof history.pushState;
    __nativeReplaceState?: typeof history.replaceState;
  }
}

/** Use native pushState to bypass Next.js router interception */
function nativePushState(url: string) {
  if (window.__nativePushState) {
    window.__nativePushState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
}

interface SpaNav {
  pathname: string;
  navigate: (href: string) => void;
}

const SpaNavContext = createContext<SpaNav>({
  pathname: '/',
  navigate: () => {},
});

export function useSpaPathname() {
  return useContext(SpaNavContext).pathname;
}

export function useSpaNavigate() {
  return useContext(SpaNavContext).navigate;
}

/** SPA routes — link clicks to these paths are intercepted for client-side navigation */
const SPA_PREFIXES = ['/events', '/category', '/portfolio', '/'];

function isSpaRoute(href: string): boolean {
  if (href === '/') return true;
  return SPA_PREFIXES.some((p) => p !== '/' && href.startsWith(p));
}

export function SpaNavigationProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const navigate = useCallback((href: string) => {
    const url = new URL(href, window.location.origin);
    if (url.pathname !== pathname || url.search !== window.location.search) {
      nativePushState(href);
      setPathname(url.pathname);
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  useEffect(() => {
    // Browser back/forward
    const onPopState = () => {
      setPathname(window.location.pathname);
    };

    // Intercept <a> clicks for SPA navigation
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return; // left click only

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.target === '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;

      // Only intercept SPA routes
      if (!isSpaRoute(href)) return;

      e.preventDefault();
      e.stopPropagation();

      const url = new URL(href, window.location.origin);
      if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
        nativePushState(href);
        setPathname(url.pathname);
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('popstate', onPopState);
    // Use capture phase to intercept before Next.js's Link handler
    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return (
    <SpaNavContext.Provider value={{ pathname, navigate }}>
      {children}
    </SpaNavContext.Provider>
  );
}
