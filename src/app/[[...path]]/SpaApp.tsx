'use client';

import { useSpaPathname } from '@/hooks/useSpaNavigation';
import { useRouteParams } from '@/hooks/useRouteParams';
import { useEvent } from '@/hooks/useEvents';
import HomePage from './HomePage';
import CategoryPage from './CategoryPage';
import EventPage from './EventPage';
import PriceUpDownEventPage from './PriceUpDownEventPage';
import MarketDetailPage from './MarketDetailPage';
import PortfolioPage from './PortfolioPage';

/** Loads event and picks page component based on displayStyle */
function EventPageRouter() {
  const { slug } = useRouteParams();
  const { data: event } = useEvent(slug);

  // Determine effective display style: event's own or series-inherited
  const style = event?.displayStyle && event.displayStyle !== 'default'
    ? event.displayStyle
    : undefined;

  if (style === 'price_up_down') return <PriceUpDownEventPage />;
  return <EventPage />;
}

function SpaRouter() {
  const pathname = useSpaPathname();
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);

  // /portfolio
  if (parts[0] === 'portfolio') {
    return <PortfolioPage />;
  }

  // /events/:slug/market/:marketId
  if (parts[0] === 'events' && parts[2] === 'market' && parts[3]) {
    return <MarketDetailPage />;
  }

  // /events/:slug
  if (parts[0] === 'events' && parts[1]) {
    return <EventPageRouter />;
  }

  // /category/:slug
  if (parts[0] === 'category' && parts[1]) {
    return <CategoryPage />;
  }

  // / or /events (events list = homepage)
  return <HomePage />;
}

export default function SpaApp() {
  return <SpaRouter />;
}
