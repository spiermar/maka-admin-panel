import { headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

export async function getLangFromUrl(): Promise<Locale> {
  const headerStore = await headers();
  
  const xLocale = headerStore.get('x-locale');
  console.log('[i18n] getLangFromUrl - x-locale header:', xLocale);
  
  if (xLocale && locales.includes(xLocale as Locale)) {
    console.log('[i18n] getLangFromUrl - returning locale:', xLocale);
    return xLocale as Locale;
  }
  
  console.log('[i18n] getLangFromUrl - using default:', defaultLocale);
  return defaultLocale;
}

export function getLangFromSearchParams(searchParams: { get: (key: string) => string | null }): Locale {
  const urlLang = searchParams.get('lang');
  return (urlLang && locales.includes(urlLang as Locale)) 
    ? urlLang as Locale 
    : defaultLocale;
}
