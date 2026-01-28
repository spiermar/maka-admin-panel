import { describe, it, expect } from 'vitest';
import { loginSchema, passwordSchema, registerSchema } from '@/lib/validations/auth';

describe('Auth Validation', () => {
  describe('passwordSchema', () => {
    it('accepts valid passwords with 12+ chars and 3+ types', () => {
      expect(() => passwordSchema.parse('Password1234')).not.toThrow();
      expect(() => passwordSchema.parse('password123!')).not.toThrow();
      expect(() => passwordSchema.parse('PASSWORD123!')).not.toThrow();
    });

    it('rejects passwords shorter than 12 characters', () => {
      const result = passwordSchema.safeParse('Short1!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 12 characters');
      }
    });

    it('rejects passwords with only 1 character type', () => {
      const result = passwordSchema.safeParse('passwordonly');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 3 of');
      }
    });

    it('rejects passwords with only 2 character types', () => {
      const result = passwordSchema.safeParse('lowercase123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 3 of');
      }
    });

    it('accepts passwords with uppercase, lowercase, and numbers', () => {
      expect(() => passwordSchema.parse('ValidPass123')).not.toThrow();
    });

    it('accepts passwords with uppercase, lowercase, and special chars', () => {
      expect(() => passwordSchema.parse('ValidPass!123')).not.toThrow();
    });

    it('accepts passwords with lowercase, numbers, and special chars', () => {
      expect(() => passwordSchema.parse('validpass123!')).not.toThrow();
    });
  });

  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const validData = {
        username: 'newuser',
        password: 'StrongPass123',
        confirmPassword: 'StrongPass123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects when passwords do not match', () => {
      const invalidData = {
        username: 'newuser',
        password: 'StrongPass123',
        confirmPassword: 'DifferentPass123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Passwords don't match");
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });

    it('requires strong password complexity', () => {
      const invalidData = {
        username: 'newuser',
        password: 'weakpass',
        confirmPassword: 'weakpass',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('requires username of at least 3 characters', () => {
      const invalidData = {
        username: 'ab',
        password: 'StrongPass123',
        confirmPassword: 'StrongPass123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Username must be at least 3 characters');
      }
    });
  });

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
