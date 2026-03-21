'use client';

import { useSearchParams } from 'next/navigation';
import { useRouteParams } from '@/hooks/useRouteParams';
import Link from 'next/link';
import { useTag } from '@/hooks/useTags';
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';

export default function CategoryPage() {
  const { slug } = useRouteParams();
  const searchParams = useSearchParams();
  const subTag = searchParams.get('sub');
  const { t, locale } = useTranslation();

  const { data: tagDetail, isLoading: tagLoading } = useTag(slug);
  const { data: events, isLoading: eventsLoading } = useEvents(subTag || slug);

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
            <Link
              href={`/category/${slug}`}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                !subTag
                  ? 'bg-hex-blue/20 text-hex-blue font-medium'
                  : 'bg-hex-card text-theme-secondary hover:text-theme-primary border border-hex-border'
              }`}
            >
              {t('common.all')}
            </Link>
            {tagDetail.children.map((child) => (
              <Link
                key={child.id}
                href={`/category/${slug}?sub=${child.slug}`}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  subTag === child.slug
                    ? 'bg-hex-blue/20 text-hex-blue font-medium'
                    : 'bg-hex-card text-theme-secondary hover:text-theme-primary border border-hex-border'
                }`}
              >
                {translateDynamic(child.label, child.labelTranslations, locale)}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Events grid */}
      {eventsLoading ? (
        <div className="text-theme-secondary">{t('common.loadingEvents')}</div>
      ) : events?.length === 0 ? (
        <div className="text-theme-tertiary text-center py-12">
          {t('common.noEventsInCategory')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events?.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
