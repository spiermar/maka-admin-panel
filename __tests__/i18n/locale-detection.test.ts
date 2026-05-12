import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import type { headers as nextHeaders } from 'next/headers';

type HeaderStore = Awaited<ReturnType<typeof nextHeaders>>;

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

function createHeaderStore(xLocale: string | null): HeaderStore {
  const headerStore = new Headers();

  if (xLocale !== null) {
    headerStore.set('x-locale', xLocale);
  }

  return headerStore;
}

async function mockNextHeaders(xLocale: string | null) {
  vi.spyOn(await import('next/headers'), 'headers').mockResolvedValue(createHeaderStore(xLocale));
}

describe('i18n Locale Detection', () => {
  describe('Middleware locale detection from query parameter', () => {
    it('sets x-locale header when valid lang param is provided (en)', () => {
      const request = new NextRequest('http://example.com/?lang=en');

      const response = middleware(request);

      expect(response.headers.get('x-locale')).toBe('en');
    });

    it('sets x-locale header when valid lang param is provided (pt-BR)', () => {
      const request = new NextRequest('http://example.com/?lang=pt-BR');

      const response = middleware(request);

      expect(response.headers.get('x-locale')).toBe('pt-BR');
    });

    it('does not set x-locale header when lang param is missing', () => {
      const request = new NextRequest('http://example.com/');

      const response = middleware(request);

      expect(response.headers.get('x-locale')).toBeNull();
    });

    it('does not set x-locale header when lang param is invalid', () => {
      const request = new NextRequest('http://example.com/?lang=fr');

      const response = middleware(request);

      expect(response.headers.get('x-locale')).toBeNull();
    });

    it('does not set x-locale header when lang param is empty', () => {
      const request = new NextRequest('http://example.com/?lang=');

      const response = middleware(request);

      expect(response.headers.get('x-locale')).toBeNull();
    });

    it('preserves x-locale header on nested routes', () => {
      const request = new NextRequest('http://example.com/dashboard?lang=pt-BR');

      const response = middleware(request);

      expect(response.headers.get('x-locale')).toBe('pt-BR');
    });

    it('preserves x-locale header with other query params', () => {
      const request = new NextRequest('http://example.com/dashboard?lang=en&page=1&sort=asc');

      const response = middleware(request);

      expect(response.headers.get('x-locale')).toBe('en');
    });

    it('handles lang param with special characters', () => {
      const request = new NextRequest('http://example.com/?lang=pt-BR&redirect=%2Fdashboard');

      const response = middleware(request);

      expect(response.headers.get('x-locale')).toBe('pt-BR');
    });
  });

  describe('getLangFromUrl utility', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('returns locale from x-locale header', async () => {
      const { getLangFromUrl } = await import('@/lib/i18n/utils');
      await mockNextHeaders('pt-BR');

      const locale = await getLangFromUrl();

      expect(locale).toBe('pt-BR');
    });

    it('returns default locale when x-locale header is missing', async () => {
      const { getLangFromUrl } = await import('@/lib/i18n/utils');
      await mockNextHeaders(null);

      const locale = await getLangFromUrl();

      expect(locale).toBe('en');
    });

    it('returns default locale when x-locale is invalid', async () => {
      const { getLangFromUrl } = await import('@/lib/i18n/utils');
      await mockNextHeaders('invalid-locale');

      const locale = await getLangFromUrl();

      expect(locale).toBe('en');
    });

    it('returns default locale when x-locale is empty string', async () => {
      const { getLangFromUrl } = await import('@/lib/i18n/utils');
      await mockNextHeaders('');

      const locale = await getLangFromUrl();

      expect(locale).toBe('en');
    });
  });
});