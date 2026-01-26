/**
 * Tests for session invalidation utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  invalidateUserSessions,
  invalidateAllSessions,
  getUserSessionVersion,
} from '@/lib/auth/session-invalidation';

// Mock the database
vi.mock('@/lib/db', () => ({
  execute: vi.fn(),
  queryOne: vi.fn(),
}));

describe('Session Invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('invalidateUserSessions', () => {
    it('should increment session version for specific user', async () => {
      const { execute } = await import('@/lib/db');

      await invalidateUserSessions(123);

      expect(execute).toHaveBeenCalledWith(
        'UPDATE users SET session_version = session_version + 1 WHERE id = $1',
        [123]
      );
    });
  });

  describe('invalidateAllSessions', () => {
    it('should increment session version for all users', async () => {
      const { execute } = await import('@/lib/db');

      await invalidateAllSessions();

      expect(execute).toHaveBeenCalledWith(
        'UPDATE users SET session_version = session_version + 1'
      );
    });
  });

  describe('getUserSessionVersion', () => {
    it('should return current session version', async () => {
      const { queryOne } = await import('@/lib/db');
      vi.mocked(queryOne).mockResolvedValue({ session_version: 5 });

      const version = await getUserSessionVersion(123);

      expect(version).toBe(5);
      expect(queryOne).toHaveBeenCalledWith(
        'SELECT session_version FROM users WHERE id = $1',
        [123]
      );
    });

    it('should return 1 if user not found', async () => {
      const { queryOne } = await import('@/lib/db');
      vi.mocked(queryOne).mockResolvedValue(null);

      const version = await getUserSessionVersion(999);

      expect(version).toBe(1);
    });
  });
});
