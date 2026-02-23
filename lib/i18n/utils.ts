import { headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

export async function getLangFromUrl(): Promise<Locale> {
  const headerStore = await headers();
  
  const xLocale = headerStore.get('x-locale');
  
  if (xLocale && locales.includes(xLocale as Locale)) {
    return xLocale as Locale;
  }
  
  return defaultLocale;
}

export function getLangFromSearchParams(searchParams: { get: (key: string) => string | null }): Locale {
  const urlLang = searchParams.get('lang');
  return (urlLang && locales.includes(urlLang as Locale)) 
    ? urlLang as Locale 
    : defaultLocale;
}
