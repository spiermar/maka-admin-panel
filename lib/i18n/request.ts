import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async () => {
  const headerStore = await headers();
  const url = new URL(headerStore.get('x-url') || 'http://localhost');
  const urlLang = url.searchParams.get('lang');
  
  const locale = (urlLang && locales.includes(urlLang as Locale)) 
    ? urlLang as Locale 
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
