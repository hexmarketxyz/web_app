'use client';

import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { useTranslation } from '@/hooks/useTranslation';

export default function HomePage() {
  const { data: events, isLoading } = useEvents();
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="text-theme-secondary">{t('common.loading')}</div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-theme-tertiary text-center py-12">
          {t('common.noEventsFound')}
        </div>
      )}
    </div>
  );
}
