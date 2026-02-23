import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

// This config is used by next-intl for message loading
// The actual locale detection happens in the layout via getLangFromUrl
export default getRequestConfig(async () => {
  // Return default locale - actual locale is determined in layout.tsx
  // by reading the URL query parameter
  return {
    locale: defaultLocale,
    messages: (await import(`../../messages/${defaultLocale}.json`)).default,
  };
});
