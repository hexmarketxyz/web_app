import { useLocaleStore } from '@/stores/localeStore';
import { dictionaries } from '@/i18n';

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const dict = dictionaries[locale];

  const t = (key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(dict, key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{{${k}}}`, String(v));
      }
    }
    return value;
  };

  return { t, locale };
}
