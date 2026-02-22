import { headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

export async function getLangFromUrl(): Promise<Locale> {
  const headerStore = await headers();
  
  const xUrl = headerStore.get('x-url');
  if (xUrl) {
    try {
      const url = new URL(xUrl);
      const urlLang = url.searchParams.get('lang');
      if (urlLang && locales.includes(urlLang as Locale)) {
        return urlLang as Locale;
      }
    } catch {
      // Invalid URL, continue
    }
  }
  
  return defaultLocale;
}

export function getLangFromSearchParams(searchParams: { get: (key: string) => string | null }): Locale {
  const urlLang = searchParams.get('lang');
  return (urlLang && locales.includes(urlLang as Locale)) 
    ? urlLang as Locale 
    : defaultLocale;
}
