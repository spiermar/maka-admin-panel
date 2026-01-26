/**
 * Tests for session secret validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Session Secret Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to clear cached session config
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error if SESSION_SECRET is not set', async () => {
    delete process.env.SESSION_SECRET;

    await expect(async () => {
      await import('@/lib/auth/session');
    }).rejects.toThrow('SESSION_SECRET environment variable is required');
  });

  it('should throw error if SESSION_SECRET is too short', async () => {
    process.env.SESSION_SECRET = 'short';

    await expect(async () => {
      await import('@/lib/auth/session');
    }).rejects.toThrow('SESSION_SECRET must be at least 32 characters long');
  });

  it('should throw error if weak secret detected in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'your-32-character-secret-key-here-extra';

    await expect(async () => {
      await import('@/lib/auth/session');
    }).rejects.toThrow('Default or weak SESSION_SECRET detected in production');
  });

  it('should accept valid SESSION_SECRET', async () => {
    process.env.SESSION_SECRET = 'Gx8jK2nP9qR5tU7vW0xY1zA3bC4dE6fH8iJ0kL2mN4o=';

    await expect(async () => {
      await import('@/lib/auth/session');
    }).resolves.not.toThrow();
  });

  it('should allow weak secrets in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-32chars';

    await expect(async () => {
      await import('@/lib/auth/session');
    }).resolves.not.toThrow();
  });
});
