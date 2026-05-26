export const locales = ['pt', 'en', 'fr', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt';

export const localeNames: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

export const localeFlags: Record<Locale, string> = {
  pt: '🇵🇹',
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
};

// DeepL language codes (source is always EN)
export const deeplTargetCode: Record<Locale, string> = {
  pt: 'PT-PT',
  en: 'EN-GB',
  fr: 'FR',
  es: 'ES',
};
