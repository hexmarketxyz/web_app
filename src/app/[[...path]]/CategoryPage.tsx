'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouteParams } from '@/hooks/useRouteParams';
import { useTag } from '@/hooks/useTags';
import { useInfiniteEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';

export default function CategoryPage() {
  const { slug } = useRouteParams();
  const searchParams = useSearchParams();
  const subTag = searchParams.get('sub');
  const { t, locale } = useTranslation();

  const { data: tagDetail, isLoading: tagLoading } = useTag(slug);
  const {
    data,
    isLoading: eventsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteEvents(subTag || slug, 'volume');

  const sentinelRef = useRef<HTMLDivElement>(null);

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

  if (tagLoading) {
    return <div className="text-theme-secondary">{t('common.loading')}</div>;
  }

  if (!tagDetail) {
    return <div className="text-theme-secondary">{t('common.categoryNotFound')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">{translateDynamic(tagDetail.label, tagDetail.labelTranslations, locale)}</h1>

        {/* Sub-tag pills */}
        {tagDetail.children.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            <a
              href={`/category/${slug}`}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                !subTag
                  ? 'bg-hex-blue/20 text-hex-blue font-medium'
                  : 'bg-hex-card text-theme-secondary hover:text-theme-primary border border-hex-border'
              }`}
            >
              {t('common.all')}
            </a>
            {tagDetail.children.map((child) => (
              <a
                key={child.id}
                href={`/category/${slug}?sub=${child.slug}`}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  subTag === child.slug
                    ? 'bg-hex-blue/20 text-hex-blue font-medium'
                    : 'bg-hex-card text-theme-secondary hover:text-theme-primary border border-hex-border'
                }`}
              >
                {translateDynamic(child.label, child.labelTranslations, locale)}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Events grid */}
      {eventsLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-theme-secondary">
          <LoadingSpinner />
          {t('common.loadingEvents')}
        </div>
      ) : events.length === 0 ? (
        <div className="text-theme-tertiary text-center py-12">
          {t('common.noEventsInCategory')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

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
