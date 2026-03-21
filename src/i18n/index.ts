import { en, type TranslationKeys } from './en';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';
import { vi } from './vi';
import { ja } from './ja';
import { ko } from './ko';
import type { Locale } from './config';

export const dictionaries: Record<Locale, TranslationKeys> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  vi,
  ja,
  ko,
};

export type { TranslationKeys };
export { LOCALES, DEFAULT_LOCALE, type Locale } from './config';
