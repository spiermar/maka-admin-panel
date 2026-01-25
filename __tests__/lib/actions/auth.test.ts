import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout } from '@/lib/actions/auth';
import { mockUser, mockQueryResult, createSessionMock } from '../utils/mocks';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  queryOne: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
}));

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const { queryOne } = await import('@/lib/db');
      const { getSession } = await import('@/lib/auth/session');
      const { verifyPassword } = await import('@/lib/auth/password');

      const mockSession = createSessionMock({});
      vi.mocked(queryOne).mockResolvedValue(mockUser);
      vi.mocked(getSession).mockResolvedValue(mockSession as any);
      vi.mocked(verifyPassword).mockResolvedValue(true);

      const formData = new FormData();
      formData.append('username', 'testuser');
      formData.append('password', 'password123');

      await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT: /');

      expect(queryOne).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE username = $1',
        ['testuser']
      );
      expect(verifyPassword).toHaveBeenCalledWith('password123', mockUser.password_hash);
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockSession.userId).toBe(1);
      expect(mockSession.username).toBe('testuser');
    });

    it('should reject login with invalid username', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(null);

      const formData = new FormData();
      formData.append('username', 'nonexistent');
      formData.append('password', 'password123');

      const result = await login(formData);

      expect(result).toEqual({
        success: false,
        error: 'Invalid username or password',
      });
      expect(queryOne).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE username = $1',
        ['nonexistent']
      );
    });

    it('should reject login with invalid password', async () => {
      const { queryOne } = await import('@/lib/db');
      const { verifyPassword } = await import('@/lib/auth/password');

      vi.mocked(queryOne).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const formData = new FormData();
      formData.append('username', 'testuser');
      formData.append('password', 'wrongpassword');

      const result = await login(formData);

      expect(result).toEqual({
        success: false,
        error: 'Invalid username or password',
      });
      expect(verifyPassword).toHaveBeenCalledWith('wrongpassword', mockUser.password_hash);
    });

    it('should reject login with empty username', async () => {
      const formData = new FormData();
      formData.append('username', '');
      formData.append('password', 'password123');

      const result = await login(formData);

      expect(result).toEqual({
        success: false,
        error: 'Invalid username or password',
      });
    });

    it('should reject login with empty password', async () => {
      const formData = new FormData();
      formData.append('username', 'testuser');
      formData.append('password', '');

      const result = await login(formData);

      expect(result).toEqual({
        success: false,
        error: 'Invalid username or password',
      });
    });

    it('should reject login with missing credentials', async () => {
      const formData = new FormData();

      const result = await login(formData);

      expect(result).toEqual({
        success: false,
        error: 'Invalid username or password',
      });
    });

    it('should handle database errors gracefully', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockRejectedValue(new Error('Database error'));

      const formData = new FormData();
      formData.append('username', 'testuser');
      formData.append('password', 'password123');

      await expect(login(formData)).rejects.toThrow('Database error');
    });
  });

  describe('logout', () => {
    it('should destroy session and redirect to login', async () => {
      const { getSession } = await import('@/lib/auth/session');

      const mockSession = createSessionMock({ userId: 1, username: 'testuser' });
      vi.mocked(getSession).mockResolvedValue(mockSession as any);

      await expect(logout()).rejects.toThrow('NEXT_REDIRECT: /login');

      expect(mockSession.destroy).toHaveBeenCalled();
    });

    it('should work even with no active session', async () => {
      const { getSession } = await import('@/lib/auth/session');

      const mockSession = createSessionMock({});
      vi.mocked(getSession).mockResolvedValue(mockSession as any);

      await expect(logout()).rejects.toThrow('NEXT_REDIRECT: /login');

      expect(mockSession.destroy).toHaveBeenCalled();
    });
  });
});
