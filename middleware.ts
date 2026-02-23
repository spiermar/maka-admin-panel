import { NextRequest, NextResponse } from 'next/server';
import { locales } from './lib/i18n/config';

const LOCALE_COOKIE = 'locale';

function getLocaleFromParams(request: NextRequest): string | null {
  const langParam = request.nextUrl.searchParams.get('lang');
  if (langParam && locales.includes(langParam as typeof locales[number])) {
    return langParam;
  }
  return null;
}

function getLocaleFromCookie(request: NextRequest): string | null {
  const cookie = request.cookies.get(LOCALE_COOKIE);
  if (cookie && locales.includes(cookie.value as typeof locales[number])) {
    return cookie.value;
  }
  return null;
}

function getAllowedOrigins(): string[] {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;

  if (!allowedOrigins) {
    return [];
  }

  return allowedOrigins.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
}

function isValidOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const originHostname = originUrl.hostname;

    return allowedOrigins.some(allowed => {
      // Handle wildcard patterns like https://*.vercel.app
      if (allowed.startsWith('https://*.') || allowed.startsWith('http://*.')) {
        const domain = allowed.replace(/^https?:\/\/\*\./, '');
        return originHostname.endsWith(domain);
      }

      // Exact match
      const allowedUrl = new URL(allowed);
      return originUrl.origin === allowedUrl.origin;
    });
  } catch {
    return false;
  }
}

function getOriginFromHeaders(request: NextRequest): string | null {
  const origin = request.headers.get('origin');

  if (origin) {
    return origin;
  }

  const referer = request.headers.get('referer');
  if (!referer) {
    return null;
  }

  try {
    const refererUrl = new URL(referer);
    return refererUrl.origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(request: NextRequest): string | null {
  const origin = getOriginFromHeaders(request);

  if (origin) {
    return origin;
  }

  const host = request.headers.get('host');
  if (host) {
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    return `${protocol}://${host}`;
  }

  return null;
}

export function middleware(request: NextRequest) {
  let locale = getLocaleFromParams(request);
  
  if (!locale) {
    locale = getLocaleFromCookie(request);
  }
  
  const response = NextResponse.next();

  if (locale) {
    response.headers.set('x-locale', locale);
    
    response.cookies.set({
      name: LOCALE_COOKIE,
      value: locale,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, 
    });
  }

  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    return response;
  }

  const method = request.method;
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return response;
  }

  const origin = getRequestOrigin(request);

  if (!isValidOrigin(origin, allowedOrigins)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CSRF] Invalid origin:', {
        origin,
        allowedOrigins,
        path: request.nextUrl.pathname,
      });
    } else {
      console.error('[CSRF] Invalid request origin blocked');
    }

    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
