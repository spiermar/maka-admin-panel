export const locales = ['en', 'pt-BR'] as const;
export const defaultLocale = 'en';

export type Locale = (typeof locales)[number];
