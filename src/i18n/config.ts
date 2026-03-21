export type Locale = 'en' | 'zh-CN' | 'zh-TW' | 'vi' | 'ja' | 'ko';

export interface LocaleMetadata {
  code: Locale;
  name: string;
}

export const LOCALES: LocaleMetadata[] = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

export const DEFAULT_LOCALE: Locale = 'en';
