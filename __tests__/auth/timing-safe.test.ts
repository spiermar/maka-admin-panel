import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { wrapWithConstantTime, getConstantTimeDelay } from '@/lib/auth/timing-safe';

describe('Constant Time Delay', () => {
  beforeEach(() => {
    process.env.AUTH_CONSTANT_TIME_DELAY_MS = '0';
  });

  afterEach(() => {
    delete process.env.AUTH_CONSTANT_TIME_DELAY_MS;
  });

  it('returns result from operation', async () => {
    const result = await wrapWithConstantTime(async () => {
      return 'test-result';
    }, 0);

    expect(result).toBe('test-result');
  });

  it('handles zero delay in test environment', async () => {
    const result = await wrapWithConstantTime(async () => {
      return 'quick-result';
    }, 0);

    expect(result).toBe('quick-result');
  });

  it('throws error from operation', async () => {
    await expect(
      wrapWithConstantTime(async () => {
        throw new Error('Test error');
      }, 0)
    ).rejects.toThrow('Test error');
  });

  it('uses default target duration when env not set', async () => {
    delete process.env.AUTH_CONSTANT_TIME_DELAY_MS;
    const delay = getConstantTimeDelay();

    expect(delay).toBe(100);
  });

  it('uses env variable when set', async () => {
    process.env.AUTH_CONSTANT_TIME_DELAY_MS = '500';
    const delay = getConstantTimeDelay();

    expect(delay).toBe(500);
  });
});
