import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionData } from './types';

// Validate session secret on startup
function validateSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      'SESSION_SECRET environment variable is required. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `SESSION_SECRET must be at least 32 characters long. Current length: ${secret.length}. ` +
      'Generate a secure secret with: openssl rand -base64 32'
    );
  }

  // Check for default/weak secrets in production
  if (process.env.NODE_ENV === 'production') {
    const weakSecrets = [
      'your-32-character-secret-key-here',
      'test',
      'development',
      'secret',
    ];

    if (weakSecrets.some(weak => secret.includes(weak))) {
      throw new Error(
        'Default or weak SESSION_SECRET detected in production environment. ' +
        'Generate a secure secret with: openssl rand -base64 32'
      );
    }
  }

  return secret;
}

const SESSION_SECRET = validateSessionSecret();

const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: 'ledger-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
    ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();

  if (!session.userId) {
    redirect('/login');
  }

  // Validate session version to detect invalidated sessions
  if (session.sessionVersion !== undefined) {
    const { queryOne } = await import('@/lib/db');
    const user = await queryOne<{ session_version: number }>(
      'SELECT session_version FROM users WHERE id = $1',
      [session.userId]
    );

    // If session version doesn't match, session has been invalidated
    if (!user || user.session_version !== session.sessionVersion) {
      session.destroy();
      redirect('/login');
    }
  }

  return {
    userId: session.userId,
    username: session.username,
    sessionVersion: session.sessionVersion,
  };
}

export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();

  if (!session.userId) {
    return null;
  }

  return {
    userId: session.userId,
    username: session.username,
  };
}
