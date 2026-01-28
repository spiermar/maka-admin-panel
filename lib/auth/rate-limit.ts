import { LRUCache } from 'lru-cache';

interface RateLimitEntry {
  attempts: number;
  resetTime: number;
}

const rateLimitMap = new LRUCache<string, RateLimitEntry>({
  max: 500,
  ttl: 60 * 1000, // 1 minute
});

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
}

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5
): RateLimitResult {
  const entry = rateLimitMap.get(identifier);
  const now = Date.now();

  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      attempts: 1,
      resetTime: now + 60 * 1000,
    };
    rateLimitMap.set(identifier, newEntry);

    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (entry.attempts >= maxAttempts) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.attempts += 1;
  rateLimitMap.set(identifier, entry);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - entry.attempts,
    resetTime: entry.resetTime,
  };
}

export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}
