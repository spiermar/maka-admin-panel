import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

async function getLocaleFromHeaders(): Promise<Locale> {
  const headerStore = await headers();
  const xLocale = headerStore.get('x-locale');
  
  if (xLocale && locales.includes(xLocale as Locale)) {
    return xLocale as Locale;
  }
  
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await getLocaleFromHeaders();
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
