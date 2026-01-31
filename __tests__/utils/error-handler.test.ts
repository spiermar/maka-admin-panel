import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logSecureError } from '@/lib/utils/error-handler';

describe('Secure Error Handler', () => {
  const originalEnv = process.env;
  let mockConsoleError: any;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    mockConsoleError.mockRestore();
  });

  describe('Development mode', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'development';
    });

    it('logs full error with context label', () => {
      const error = new Error('Test error');
      logSecureError('test-context', error);

      expect(mockConsoleError).toHaveBeenCalledWith('[test-context]', error);
    });

    it('logs stack trace for Error objects', () => {
      const error = new Error('Test error');
      logSecureError('test-context', error);

      expect(mockConsoleError).toHaveBeenCalledWith('[test-context] Stack:', error.stack);
    });

    it('logs string errors', () => {
      logSecureError('test-context', 'String error');

      expect(mockConsoleError).toHaveBeenCalledWith('[test-context]', 'String error');
    });
  });

  describe('Production mode', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'production';
    });

    it('logs sanitized error object', () => {
      const error = new Error('Test error');
      logSecureError('test-context', error);

      const loggedCalls = mockConsoleError.mock.calls;
      const logEntry = JSON.parse(loggedCalls[0][0] as string);

      expect(logEntry).toHaveProperty('message', 'Test error');
      expect(logEntry).toHaveProperty('context', 'test-context');
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).not.toHaveProperty('stack');
    });

    it('logs unknown errors as unknown message', () => {
      logSecureError('test-context', null);

      const loggedCalls = mockConsoleError.mock.calls;
      const logEntry = JSON.parse(loggedCalls[0][0] as string);

      expect(logEntry.message).toBe('Unknown error');
    });

    it('does not include stack trace', () => {
      const error = new Error('Test error');
      logSecureError('test-context', error);

      const loggedCalls = mockConsoleError.mock.calls;
      const logEntry = JSON.parse(loggedCalls[0][0] as string);

      expect(logEntry).not.toHaveProperty('stack');
    });
  });
});
