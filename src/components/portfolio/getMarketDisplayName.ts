import { translateDynamic } from '@/i18n/dynamic';
import type { OutcomeEventContext } from '@/hooks/useOutcomeDetails';
import type { Outcome } from '@hexmarket/sdk';
import type { Locale } from '@/i18n/config';

/**
 * Build the display name for a market in the portfolio tables.
 * For multi-market events: "{market title} - {event title}"
 * For single-market events: just the question (market title)
 */
export function getMarketDisplayName(
  outcomeId: string,
  outcome: Outcome | undefined,
  eventContextMap: Map<string, OutcomeEventContext>,
  locale: Locale,
): string {
  const ctx = eventContextMap.get(outcomeId);

  if (ctx && ctx.marketCount > 1) {
    const marketTitle = translateDynamic(ctx.marketTitle, ctx.marketTitleTranslations, locale);
    const eventTitle = translateDynamic(ctx.eventTitle, ctx.eventTitleTranslations, locale);
    return `${marketTitle} - ${eventTitle}`;
  }

  // Single-market event: use the outcome's question (which is the market title)
  if (outcome) {
    return translateDynamic(outcome.question, outcome.questionTranslations, locale);
  }

  return '';
}
