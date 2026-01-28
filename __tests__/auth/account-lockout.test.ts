import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAccountLockoutStatus,
  incrementFailedAttempts,
  resetFailedAttempts,
} from '@/lib/auth/account-lockout';

vi.mock('@/lib/db', () => ({
  execute: vi.fn(),
  queryOne: vi.fn(),
}));

describe('Account Lockout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks failed attempts', async () => {
    const { queryOne, execute } = await import('@/lib/db');

    vi.mocked(queryOne).mockResolvedValueOnce({ failed_login_attempts: 0 });
    vi.mocked(execute).mockResolvedValueOnce(undefined);

    await incrementFailedAttempts(99999);

    expect(queryOne).toHaveBeenCalledWith(
      'SELECT failed_login_attempts FROM users WHERE id = $1',
      [99999]
    );
    expect(execute).toHaveBeenCalledWith(
      'UPDATE users\n     SET failed_login_attempts = $1, locked_until = $2\n     WHERE id = $3',
      [1, null, 99999]
    );
  });

  it('locks account after 5 failed attempts', async () => {
    const { queryOne, execute } = await import('@/lib/db');

    vi.mocked(queryOne).mockResolvedValueOnce({ failed_login_attempts: 4 });
    vi.mocked(execute).mockResolvedValueOnce(undefined);

    await incrementFailedAttempts(99999);

    expect(execute).toHaveBeenCalled();
    const executeCall = vi.mocked(execute).mock.calls[0]!;
    const lockUntil = executeCall[1]![1] as Date;

    const lockDuration = lockUntil.getTime() - Date.now();
    expect(lockDuration).toBeGreaterThanOrEqual(4 * 60 * 1000);
    expect(lockDuration).toBeLessThanOrEqual(6 * 60 * 1000);
  });

  it('escalates lockout duration at 10 attempts', async () => {
    const { queryOne, execute } = await import('@/lib/db');

    vi.mocked(queryOne).mockResolvedValueOnce({ failed_login_attempts: 9 });
    vi.mocked(execute).mockResolvedValueOnce(undefined);

    await incrementFailedAttempts(99999);

    expect(execute).toHaveBeenCalled();
    const executeCall = vi.mocked(execute).mock.calls[0]!;
    const lockUntil = executeCall[1]![1] as Date;

    const lockDuration = lockUntil.getTime() - Date.now();
    expect(lockDuration).toBeGreaterThanOrEqual(29 * 60 * 1000);
    expect(lockDuration).toBeLessThanOrEqual(31 * 60 * 1000);
  });

  it('escalates lockout duration at 15 attempts', async () => {
    const { queryOne, execute } = await import('@/lib/db');

    vi.mocked(queryOne).mockResolvedValueOnce({ failed_login_attempts: 14 });
    vi.mocked(execute).mockResolvedValueOnce(undefined);

    await incrementFailedAttempts(99999);

    expect(execute).toHaveBeenCalled();
    const executeCall = vi.mocked(execute).mock.calls[0]!;
    const lockUntil = executeCall[1]![1] as Date;

    const lockDuration = lockUntil.getTime() - Date.now();
    expect(lockDuration).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
    expect(lockDuration).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
  });

  it('resets failed attempts on successful login', async () => {
    const { execute } = await import('@/lib/db');

    vi.mocked(execute).mockResolvedValueOnce(undefined);

    await resetFailedAttempts(99999);

    expect(execute).toHaveBeenCalledWith(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [99999]
    );
  });

  it('returns unlocked status for non-existent user', async () => {
    const { queryOne } = await import('@/lib/db');

    vi.mocked(queryOne).mockResolvedValueOnce(null);

    const status = await getAccountLockoutStatus(0);

    expect(status.isLocked).toBe(false);
    expect(status.failedAttempts).toBe(0);
    expect(status.lockedUntil).toBeNull();
  });

  it('returns lockout status for locked user', async () => {
    const { queryOne } = await import('@/lib/db');

    const futureDate = new Date(Date.now() + 60 * 1000);
    vi.mocked(queryOne).mockResolvedValueOnce({
      locked_until: futureDate,
      failed_login_attempts: 5,
    });

    const status = await getAccountLockoutStatus(999);

    expect(status.isLocked).toBe(true);
    expect(status.failedAttempts).toBe(5);
    expect(status.lockedUntil).toEqual(futureDate);
  });

  it('returns unlocked status for expired lockout', async () => {
    const { queryOne } = await import('@/lib/db');

    const pastDate = new Date(Date.now() - 60 * 1000);
    vi.mocked(queryOne).mockResolvedValueOnce({
      locked_until: pastDate,
      failed_login_attempts: 5,
    });

    const status = await getAccountLockoutStatus(999);

    expect(status.isLocked).toBe(false);
    expect(status.failedAttempts).toBe(5);
  });
});
