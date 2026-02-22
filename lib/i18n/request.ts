import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async () => {
  const headerStore = await headers();
  const url = new URL(headerStore.get('x-url') || 'http://localhost');
  const urlLang = url.searchParams.get('lang');
  
  const locale = (urlLang && locales.includes(urlLang as any)) 
    ? urlLang as any 
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});