import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/lib/validations/auth';

describe('Auth Validation', () => {
  describe('loginSchema', () => {
    it('should validate correct login credentials', () => {
      const validData = {
        username: 'testuser',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject empty username', () => {
      const invalidData = {
        username: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username is required');
      }
    });

    it('should reject missing username', () => {
      const invalidData = {
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        username: 'testuser',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('should reject missing password', () => {
      const invalidData = {
        username: 'testuser',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject both empty fields', () => {
      const invalidData = {
        username: '',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
      }
    });

    it('should accept special characters in username and password', () => {
      const validData = {
        username: 'user@example.com',
        password: 'P@ssw0rd!#$',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
