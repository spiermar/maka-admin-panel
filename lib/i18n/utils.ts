import { headers } from 'next/headers';
import { locales, defaultLocale } from './config';

export async function getLangFromUrl() {
  const headerStore = await headers();
  const url = new URL(headerStore.get('x-url') || 'http://localhost');
  const urlLang = url.searchParams.get('lang');
  return (urlLang && locales.includes(urlLang as any)) 
    ? urlLang 
    : defaultLocale;
}

export function getLangFromSearchParams(searchParams: { get: (key: string) => string | null }) {
  const urlLang = searchParams.get('lang');
  return (urlLang && locales.includes(urlLang as any)) 
    ? urlLang 
    : defaultLocale;
}