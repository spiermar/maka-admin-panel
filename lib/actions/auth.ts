'use server';

import { redirect } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { User } from '@/lib/db/types';
import { getSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { wrapWithConstantTime, getConstantTimeDelay } from '@/lib/auth/timing-safe';
import { loginSchema } from '@/lib/validations/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';
import { getAccountLockoutStatus, incrementFailedAttempts, resetFailedAttempts } from '@/lib/auth/account-lockout';

export async function login(prevState: any, formData: FormData) {
  const targetDelay = getConstantTimeDelay();

  const result = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!result.success) {
    await wrapWithConstantTime(async () => {}, targetDelay);
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const { username, password } = result.data;

  const user = await wrapWithConstantTime(async () => {
    return await queryOne<User>(
      'SELECT id, username, password_hash, session_version FROM users WHERE username = $1',
      [username]
    );
  }, targetDelay);

  if (!user) {
    await wrapWithConstantTime(async () => {
      checkRateLimit(`login:invalid:${username}`);
    }, targetDelay);
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  // Check rate limit FIRST for rapid repeated attempts (short-term protection)
  const rateLimit = checkRateLimit(`login:user:${user.id}`);
  if (!rateLimit.allowed) {
    await wrapWithConstantTime(async () => {}, targetDelay);
    return {
      success: false,
      error: 'Too many login attempts. Please try again later.',
    };
  }

  // Check account lockout for sustained failed attempts (long-term protection)
  const lockoutStatus = await getAccountLockoutStatus(user.id);
  if (lockoutStatus.isLocked) {
    const minutesUntil = Math.ceil((lockoutStatus.lockedUntil!.getTime() - Date.now()) / (60 * 1000));
    await wrapWithConstantTime(async () => {}, targetDelay);
    return {
      success: false,
      error: `Account temporarily locked. Try again in ${minutesUntil} minutes.`,
    };
  }

  const isValid = await wrapWithConstantTime(async () => {
    return await verifyPassword(password, user.password_hash);
  }, targetDelay);

  if (!isValid) {
    await wrapWithConstantTime(async () => {
      // Only increment account lockout counter if this attempt wasn't rate-limited
      if (rateLimit.remainingAttempts >= 0) {
        await incrementFailedAttempts(user.id);
      }
    }, targetDelay);
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  await wrapWithConstantTime(async () => {
    await resetFailedAttempts(user.id);
    resetRateLimit(`login:user:${user.id}`);

    const oldSession = await getSession();
    await oldSession.destroy();

    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.sessionVersion = user.session_version || 1;
    await session.save();
  }, targetDelay);

  return {
    success: true,
  };
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
