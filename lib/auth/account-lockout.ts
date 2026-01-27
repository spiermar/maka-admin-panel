import { execute, queryOne } from '@/lib/db';

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
}

export async function getAccountLockoutStatus(
  userId: number
): Promise<LockoutStatus> {
  const result = await queryOne<{ locked_until: Date | null; failed_login_attempts: number }>(
    'SELECT locked_until, failed_login_attempts FROM users WHERE id = $1',
    [userId]
  );

  if (!result) {
    return { isLocked: false, lockedUntil: null, failedAttempts: 0 };
  }

  const isLocked = result.locked_until !== null && new Date(result.locked_until) > new Date();

  return {
    isLocked,
    lockedUntil: result.locked_until,
    failedAttempts: result.failed_login_attempts,
  };
}

export async function incrementFailedAttempts(userId: number): Promise<void> {
  const result = await queryOne<{ failed_login_attempts: number }>(
    'SELECT failed_login_attempts FROM users WHERE id = $1',
    [userId]
  );

  const currentAttempts = result?.failed_login_attempts || 0;
  const newAttempts = currentAttempts + 1;

  let lockedUntil: Date | null = null;

  if (newAttempts >= 15) {
    lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  } else if (newAttempts >= 10) {
    lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  } else if (newAttempts >= 5) {
    lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
  }

  await execute(
    `UPDATE users
     SET failed_login_attempts = $1, locked_until = $2
     WHERE id = $3`,
    [newAttempts, lockedUntil, userId]
  );
}

export async function resetFailedAttempts(userId: number): Promise<void> {
  await execute(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [userId]
  );
}
