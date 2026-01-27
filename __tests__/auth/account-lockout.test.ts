import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccountLockoutStatus,
  incrementFailedAttempts,
  resetFailedAttempts,
} from '@/lib/auth/account-lockout';

describe('Account Lockout', () => {
  beforeEach(async () => {
    await resetFailedAttempts(99999);
  });

  it('tracks failed attempts', async () => {
    await incrementFailedAttempts(99999);

    const status = await getAccountLockoutStatus(99999);
    expect(status.failedAttempts).toBe(1);
    expect(status.isLocked).toBe(false);
  });

  it('locks account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await incrementFailedAttempts(99999);
    }

    const status = await getAccountLockoutStatus(99999);
    expect(status.isLocked).toBe(true);
    expect(status.failedAttempts).toBe(5);
    expect(status.lockedUntil).not.toBeNull();
  });

  it('escalates lockout duration at 10 attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await incrementFailedAttempts(99999);
    }

    const status = await getAccountLockoutStatus(99999);
    expect(status.isLocked).toBe(true);
    expect(status.failedAttempts).toBe(10);

    const lockDuration = status.lockedUntil!.getTime() - Date.now();
    expect(lockDuration).toBeGreaterThanOrEqual(29 * 60 * 1000);
    expect(lockDuration).toBeLessThanOrEqual(31 * 60 * 1000);
  });

  it('escalates lockout duration at 15 attempts', async () => {
    for (let i = 0; i < 15; i++) {
      await incrementFailedAttempts(99999);
    }

    const status = await getAccountLockoutStatus(99999);
    expect(status.isLocked).toBe(true);
    expect(status.failedAttempts).toBe(15);

    const lockDuration = status.lockedUntil!.getTime() - Date.now();
    expect(lockDuration).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
    expect(lockDuration).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
  });

  it('resets failed attempts on successful login', async () => {
    for (let i = 0; i < 5; i++) {
      await incrementFailedAttempts(99999);
    }

    const lockedStatus = await getAccountLockoutStatus(99999);
    expect(lockedStatus.isLocked).toBe(true);

    await resetFailedAttempts(99999);

    const resetStatus = await getAccountLockoutStatus(99999);
    expect(resetStatus.isLocked).toBe(false);
    expect(resetStatus.failedAttempts).toBe(0);
    expect(resetStatus.lockedUntil).toBeNull();
  });

  it('returns unlocked status for non-existent user', async () => {
    const status = await getAccountLockoutStatus(0);
    expect(status.isLocked).toBe(false);
    expect(status.failedAttempts).toBe(0);
    expect(status.lockedUntil).toBeNull();
  });
});
