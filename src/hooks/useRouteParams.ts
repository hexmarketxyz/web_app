'use client';

import { useSpaPathname } from './useSpaNavigation';

/**
 * Parse route params from SPA pathname.
 * Replaces useParams() which only works with Next.js dynamic segments.
 */
export function useRouteParams(): Record<string, string> {
  const pathname = useSpaPathname();
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);

  // /events/:slug/market/:marketId
  if (parts[0] === 'events' && parts[2] === 'market' && parts[3]) {
    return { slug: parts[1], marketId: parts[3] };
  }
  // /events/:slug
  if (parts[0] === 'events' && parts[1]) {
    return { slug: parts[1] };
  }
  // /category/:slug
  if (parts[0] === 'category' && parts[1]) {
    return { slug: parts[1] };
  }

  return {};
}
