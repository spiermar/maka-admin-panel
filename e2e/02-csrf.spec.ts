import { test, expect } from './fixtures';
import { login } from './helpers/auth';
import { getAccountIdByName } from './helpers/database';

test.describe('CSRF Protection', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
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
