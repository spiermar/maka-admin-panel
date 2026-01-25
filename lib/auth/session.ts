import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionData } from './types';

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ledger-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
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

  return {
    userId: session.userId,
    username: session.username,
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
