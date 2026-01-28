import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('CSRF Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Origin validation', () => {
    it('allows requests with valid Origin header', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'https://example.com' },
      });

      const response = middleware(request);
      expect(response.status).not.toBe(403);
    });

    it('blocks requests with invalid Origin header', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });

    it('allows requests with valid Referer header when Origin missing', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { referer: 'https://example.com/dashboard' },
      });

      const response = middleware(request);
      expect(response.status).not.toBe(403);
    });

    it('blocks requests with invalid Referer header', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { referer: 'https://malicious.com/dashboard' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Method filtering', () => {
    it('skips validation for GET requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/data', {
        method: 'GET',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).not.toBe(403);
    });

    it('skips validation for HEAD requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/data', {
        method: 'HEAD',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).not.toBe(403);
    });

    it('skips validation for OPTIONS requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/data', {
        method: 'OPTIONS',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).not.toBe(403);
    });

    it('validates POST requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });

    it('validates PUT requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'PUT',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });

    it('validates DELETE requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'DELETE',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });

    it('validates PATCH requests', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'PATCH',
        headers: { origin: 'https://malicious.com' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Safe default behavior', () => {
    it('skips validation when ALLOWED_ORIGINS is not set', () => {
      delete process.env.ALLOWED_ORIGINS;

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
      });

      const response = middleware(request);
      expect(response.status).not.toBe(403);
    });

    it('skips validation when ALLOWED_ORIGINS is empty string', () => {
      process.env.ALLOWED_ORIGINS = '';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
      });

      const response = middleware(request);
      expect(response.status).not.toBe(403);
    });

    it('skips validation when ALLOWED_ORIGINS is whitespace only', () => {
      process.env.ALLOWED_ORIGINS = '   ';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
      });

      const response = middleware(request);
      expect(response.status).not.toBe(403);
    });
  });

  describe('Multiple origins support', () => {
    it('allows requests from any configured origin', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com,https://staging.example.com';

      const request1 = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'https://app.example.com' },
      });

      const response1 = middleware(request1);
      expect(response1.status).not.toBe(403);

      const request2 = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'https://staging.example.com' },
      });

      const response2 = middleware(request2);
      expect(response2.status).not.toBe(403);
    });

    it('blocks requests from unconfigured origin', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'https://attacker.com' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Error handling', () => {
    it('handles malformed Origin header gracefully', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { origin: 'not-a-valid-url' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });

    it('handles malformed Referer header gracefully', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const request = new NextRequest('http://example.com/api/transactions', {
        method: 'POST',
        headers: { referer: 'not-a-valid-url' },
      });

      const response = middleware(request);
      expect(response.status).toBe(403);
    });
  });
});
