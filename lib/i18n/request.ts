import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

async function getLocaleFromHeaders(): Promise<Locale> {
  const headerStore = await headers();
  
  // Try x-url header first
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

export default getRequestConfig(async () => {
  const locale = await getLocaleFromHeaders();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
