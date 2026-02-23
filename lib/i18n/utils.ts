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
