/**
 * Session Invalidation Utilities
 *
 * These functions handle invalidating user sessions on security events
 * such as password changes, account lockouts, or suspicious activity.
 */

import { execute } from '@/lib/db';

/**
 * Invalidate all sessions for a user by incrementing their session version.
 * This will force all active sessions to be destroyed on next request.
 *
 * @param userId - The user ID whose sessions should be invalidated
 * @returns Promise that resolves when session version is incremented
 *
 * @example
 * // After password change
 * await invalidateUserSessions(userId);
 *
 * // After detecting suspicious activity
 * await invalidateUserSessions(suspiciousUserId);
 */
export async function invalidateUserSessions(userId: number): Promise<void> {
  await execute(
    'UPDATE users SET session_version = session_version + 1 WHERE id = $1',
    [userId]
  );
}

/**
 * Invalidate all sessions for all users.
 * WARNING: Use with extreme caution - this logs out all users.
 * Only use in emergency situations (e.g., security breach).
 *
 * @returns Promise that resolves when all session versions are incremented
 */
export async function invalidateAllSessions(): Promise<void> {
  await execute('UPDATE users SET session_version = session_version + 1');
}

/**
 * Get the current session version for a user.
 * Useful for debugging or audit purposes.
 *
 * @param userId - The user ID to check
 * @returns Promise that resolves to the current session version
 */
export async function getUserSessionVersion(userId: number): Promise<number> {
  const { queryOne } = await import('@/lib/db');
  const result = await queryOne<{ session_version: number }>(
    'SELECT session_version FROM users WHERE id = $1',
    [userId]
  );
  return result?.session_version || 1;
}
