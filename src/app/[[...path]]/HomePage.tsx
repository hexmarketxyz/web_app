'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { useTranslation } from '@/hooks/useTranslation';

export default function HomePage() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteEvents(undefined, 'volume');
  const { t } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll via IntersectionObserver
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const events = data?.pages.flat() ?? [];

  return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-theme-secondary">
          <LoadingSpinner />
          {t('common.loading')}
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-6 gap-2 text-theme-secondary text-sm">
              <LoadingSpinner />
              {t('common.loadingMore')}
            </div>
          )}

          {!hasNextPage && !isFetchingNextPage && events.length > 0 && (
            <div className="text-theme-tertiary text-center py-6 text-sm">
              {t('common.noMoreEvents')}
            </div>
          )}
        </>
      ) : (
        <div className="text-theme-tertiary text-center py-12">
          {t('common.noEventsFound')}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
