// Shared i18n constants — must stay free of server-only imports
// (this module is also imported by client components).
export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  zh: '中文'
};
