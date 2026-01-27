import { NextRequest, NextResponse } from 'next/server';

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
    return allowedOrigins.some(allowed => {
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

export function middleware(request: NextRequest) {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    return NextResponse.next();
  }

  const method = request.method;
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return NextResponse.next();
  }

  const origin = getOriginFromHeaders(request);

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
