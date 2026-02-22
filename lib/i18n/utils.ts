import { headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

export async function getLangFromUrl(): Promise<Locale> {
  const headerStore = await headers();
  
  // Try different header names that might contain the full URL
  const xUrl = headerStore.get('x-url') || headerStore.get('x-invoke-path') || headerStore.get('referer');
  
  if (xUrl) {
    try {
      // Try parsing directly
      let url;
      try {
        url = new URL(xUrl);
      } catch {
        // If it doesn't have protocol, add it
        url = new URL(xUrl.startsWith('/') ? `http://localhost${xUrl}` : xUrl);
      }
      
      const urlLang = url.searchParams.get('lang');
      if (urlLang && locales.includes(urlLang as Locale)) {
        return urlLang as Locale;
      }
    } catch {
      // Continue to default
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
