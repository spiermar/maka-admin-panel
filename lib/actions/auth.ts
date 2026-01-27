'use server';

import { redirect } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { User } from '@/lib/db/types';
import { getSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/validations/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';
import { getAccountLockoutStatus, incrementFailedAttempts, resetFailedAttempts } from '@/lib/auth/account-lockout';

export async function login(prevState: any, formData: FormData) {
  const result = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!result.success) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const { username, password } = result.data;

  const user = await queryOne<User>(
    'SELECT id, username, password_hash, session_version FROM users WHERE username = $1',
    [username]
  );

  if (!user) {
    checkRateLimit(`login:invalid:${username}`);
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const lockoutStatus = await getAccountLockoutStatus(user.id);
  if (lockoutStatus.isLocked) {
    const minutesUntil = Math.ceil((lockoutStatus.lockedUntil!.getTime() - Date.now()) / (60 * 1000));
    return {
      success: false,
      error: `Account temporarily locked. Try again in ${minutesUntil} minutes.`,
    };
  }

  const rateLimit = checkRateLimit(`login:user:${user.id}`);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Too many login attempts. Please try again later.',
    };
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    await incrementFailedAttempts(user.id);
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  await resetFailedAttempts(user.id);
  resetRateLimit(`login:user:${user.id}`);

  const oldSession = await getSession();
  await oldSession.destroy();

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.sessionVersion = user.session_version || 1;
  await session.save();

  return {
    success: true,
  };
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
