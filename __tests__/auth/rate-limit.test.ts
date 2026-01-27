import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimit('test-user');
    resetRateLimit('test-ip');
  });

  it('allows up to 5 attempts within time window', () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit('test-user', 5);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(4 - i);
    }
  });

  it('blocks 6th attempt', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('test-user', 5);
    }

    const result = checkRateLimit('test-user', 5);
    expect(result.allowed).toBe(false);
    expect(result.remainingAttempts).toBe(0);
  });

  it('tracks separate counters for different identifiers', () => {
    checkRateLimit('user1', 5);
    checkRateLimit('user2', 5);

    const result1 = checkRateLimit('user1', 5);
    const result2 = checkRateLimit('user2', 5);

    expect(result1.remainingAttempts).toBe(3);
    expect(result2.remainingAttempts).toBe(3);
  });

  it('resets rate limit when explicitly called', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('test-user', 5);
    }

    resetRateLimit('test-user');

    const result = checkRateLimit('test-user', 5);
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(4);
  });

  it('returns valid reset time', () => {
    const result = checkRateLimit('test-user', 5);
    const now = Date.now();
    expect(result.resetTime).toBeGreaterThan(now);
    expect(result.resetTime).toBeLessThanOrEqual(now + 60 * 1000 + 1000);
  });

  it('respects custom max attempts', () => {
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit('test-custom', 10);
      if (i < 10) {
        expect(result.allowed).toBe(true);
      }
    }

    const result = checkRateLimit('test-custom', 10);
    expect(result.allowed).toBe(false);
  });
});
