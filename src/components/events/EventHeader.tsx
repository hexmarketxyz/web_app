'use client';

import { useRef, useState, useEffect } from 'react';
import type { EventDetail } from '@hexmarket/sdk';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';

import { imageUrl } from '@/lib/imageUrl';

interface EventHeaderProps {
  event: EventDetail;
}

function EventIcon({ event, size }: { event: EventDetail; size: number }) {
  const src = imageUrl(event.iconUrl) || event.imageUrl || null;

  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      className="rounded-xl object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function ActionIcons() {
  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(window.location.href)}
        className="text-theme-tertiary hover:text-theme-primary transition"
        title="Copy link"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <button
        type="button"
        className="text-theme-tertiary hover:text-theme-primary transition"
        title="Bookmark"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}

export function EventHeader({ event }: EventHeaderProps) {
  const { locale } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-105px 0px 0px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Normal header + sentinel */}
      <div>
        <div ref={sentinelRef} className="h-0" />
        <div
          className={`transition-all duration-150 ${
            stuck ? 'h-0 overflow-hidden opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex items-start gap-4">
            <EventIcon event={event} size={48} />
            <div className="flex-1 min-w-0">
              {event.tags.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-theme-secondary mb-1">
                  {event.tags.map((tag, i) => (
                    <span key={tag.id} className="flex items-center gap-1">
                      {i > 0 && <span className="text-theme-tertiary">·</span>}
                      <a
                        href={`/category/${tag.slug}`}
                        className="hover:text-hex-blue transition"
                      >
                        {translateDynamic(tag.label, tag.labelTranslations, locale)}
                      </a>
                    </span>
                  ))}
                </div>
              )}
              <h1 className="text-2xl font-bold leading-snug">{translateDynamic(event.title, event.titleTranslations, locale)}</h1>
            </div>
            <ActionIcons />
          </div>
        </div>
      </div>

      {/* Sticky compact bar — direct child of left column so sticky range spans full height.
          h-0 + -mt-6 keeps it zero-impact in layout; inner bar overflows visually. */}
      <div className="sticky top-[6.5rem] z-40 h-0 -mt-6">
        <div
          className={`bg-hex-dark border-b border-hex-border h-12 flex items-center gap-3 transition-opacity duration-150 ${
            stuck ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <EventIcon event={event} size={32} />
          <span className="font-semibold text-sm truncate flex-1">
            {translateDynamic(event.title, event.titleTranslations, locale)}
          </span>
          <ActionIcons />
        </div>
      </div>
    </>
  );
}
