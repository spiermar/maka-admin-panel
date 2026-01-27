import { test, expect } from '@playwright/test';

test.describe('CSRF Protection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('blocks requests with invalid Origin header', async ({ request, page }) => {
    const baseURL = page.context().browser()?.contexts()[0].pages()[0].url() || 'http://localhost:3000';
    const response = await request.post(`${baseURL}/api/transactions`, {
      headers: {
        origin: 'https://malicious.com',
      },
      form: {
        account_id: '1',
        amount: '-100',
        payee: 'Attacker',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('allows requests with valid Origin header', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Add Transaction');

    await page.fill('input[name="amount"]', '100');
    await page.fill('input[name="payee"]', 'Test Payee');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Transaction added')).toBeVisible();
  });
});
