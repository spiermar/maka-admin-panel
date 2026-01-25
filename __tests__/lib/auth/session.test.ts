import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSession, requireAuth, getCurrentUser } from '@/lib/auth/session';
import { createSessionMock } from '../utils/mocks';

// Mock the session module
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
  SessionOptions: {},
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('should return session object', async () => {
      const { getIronSession } = await import('iron-session');
      const { cookies } = await import('next/headers');

      const mockSession = createSessionMock({ userId: 1, username: 'testuser' });
      vi.mocked(cookies).mockResolvedValue({} as any);
      vi.mocked(getIronSession).mockResolvedValue(mockSession as any);

      const session = await getSession();

      expect(session).toBeDefined();
      expect(cookies).toHaveBeenCalled();
      expect(getIronSession).toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should return session data when authenticated', async () => {
      const { getIronSession } = await import('iron-session');
      const { cookies } = await import('next/headers');

      const mockSession = createSessionMock({ userId: 1, username: 'testuser' });
      vi.mocked(cookies).mockResolvedValue({} as any);
      vi.mocked(getIronSession).mockResolvedValue(mockSession as any);

      const result = await requireAuth();

      expect(result).toEqual({
        userId: 1,
        username: 'testuser',
      });
    });

    it('should redirect to login when not authenticated', async () => {
      const { getIronSession } = await import('iron-session');
      const { cookies } = await import('next/headers');

      const mockSession = createSessionMock({});
      vi.mocked(cookies).mockResolvedValue({} as any);
      vi.mocked(getIronSession).mockResolvedValue(mockSession as any);

      await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT: /login');
    });

    it('should redirect when userId is undefined', async () => {
      const { getIronSession } = await import('iron-session');
      const { cookies } = await import('next/headers');

      const mockSession = createSessionMock({ userId: undefined, username: 'test' });
      vi.mocked(cookies).mockResolvedValue({} as any);
      vi.mocked(getIronSession).mockResolvedValue(mockSession as any);

      await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT: /login');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data when authenticated', async () => {
      const { getIronSession } = await import('iron-session');
      const { cookies } = await import('next/headers');

      const mockSession = createSessionMock({ userId: 1, username: 'testuser' });
      vi.mocked(cookies).mockResolvedValue({} as any);
      vi.mocked(getIronSession).mockResolvedValue(mockSession as any);

      const result = await getCurrentUser();

      expect(result).toEqual({
        userId: 1,
        username: 'testuser',
      });
    });

    it('should return null when not authenticated', async () => {
      const { getIronSession } = await import('iron-session');
      const { cookies } = await import('next/headers');

      const mockSession = createSessionMock({});
      vi.mocked(cookies).mockResolvedValue({} as any);
      vi.mocked(getIronSession).mockResolvedValue(mockSession as any);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when userId is undefined', async () => {
      const { getIronSession } = await import('iron-session');
      const { cookies } = await import('next/headers');

      const mockSession = createSessionMock({ userId: undefined, username: 'test' });
      vi.mocked(cookies).mockResolvedValue({} as any);
      vi.mocked(getIronSession).mockResolvedValue(mockSession as any);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });
});
