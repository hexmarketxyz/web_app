'use client';

import { SpaNavigationProvider, useSpaPathname } from '@/hooks/useSpaNavigation';
import HomePage from './HomePage';
import CategoryPage from './CategoryPage';
import EventPage from './EventPage';
import MarketDetailPage from './MarketDetailPage';

function SpaRouter() {
  const pathname = useSpaPathname();
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);

  // /events/:slug/market/:marketId
  if (parts[0] === 'events' && parts[2] === 'market' && parts[3]) {
    return <MarketDetailPage />;
  }

  // /events/:slug
  if (parts[0] === 'events' && parts[1]) {
    return <EventPage />;
  }

  // /category/:slug
  if (parts[0] === 'category' && parts[1]) {
    return <CategoryPage />;
  }

  // / or /events (events list = homepage)
  return <HomePage />;
}

export default function SpaApp() {
  return (
    <SpaNavigationProvider>
      <SpaRouter />
    </SpaNavigationProvider>
  );
}
