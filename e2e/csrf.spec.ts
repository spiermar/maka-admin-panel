import { test, expect } from '@playwright/test';

test.describe('CSRF Protection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('blocks requests with invalid Origin header', async ({ page }) => {
    const baseURL = 'http://localhost:3000';

    await page.goto('/accounts/1');

    const response = await page.request.post(`${baseURL}/api/test-csrf`, {
      headers: {
        origin: 'https://malicious.com',
      },
      data: {
        test: 'data',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('allows requests with valid Origin header', async ({ page }) => {
    const baseURL = 'http://localhost:3000';

    await page.goto('/accounts/1');

    const response = await page.request.post(`${baseURL}/api/test-csrf`, {
      headers: {
        origin: 'http://localhost:3000',
      },
      data: {
        test: 'data',
      },
    });

    expect(response.status()).toBe(200);
  });
});
