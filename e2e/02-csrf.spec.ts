import { test, expect } from './fixtures';
import { getAccountIdByName } from './helpers/database';

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
    const accountId = await getAccountIdByName('Checking Account');

    await page.goto(`/accounts/${accountId}`);

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
    const accountId = await getAccountIdByName('Checking Account');

    await page.goto(`/accounts/${accountId}`);

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
