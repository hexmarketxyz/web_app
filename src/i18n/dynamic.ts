import type { Locale } from './config';

/**
 * Pick the best translation for a dynamic string from the API.
 * Falls back: locale -> 'en' -> original value.
 */
export function translateDynamic(
  value: string,
  translations: Record<string, string> | undefined | null,
  locale: Locale,
): string {
  if (!translations) return value;
  return translations[locale] ?? translations['en'] ?? value;
}

/**
 * Translate known outcome labels (Yes/No) using the static dictionary.
 * For unknown labels, return as-is.
 */
export function translateOutcomeLabel(
  label: string,
  t: (key: string) => string,
): string {
  const lower = label.toLowerCase();
  if (lower === 'yes') return t('outcomes.yes');
  if (lower === 'no') return t('outcomes.no');
  return label;
}
