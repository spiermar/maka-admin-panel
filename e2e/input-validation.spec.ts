import { test, expect } from '@playwright/test';

test.describe('Transaction Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('prevents submission of amount exceeding limit', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Add Transaction');

    await page.fill('input[name="amount"]', '1000000.01');
    await page.fill('input[name="payee"]', 'Test');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Amount must be between')).toBeVisible();
  });

  test('allows submission of amount at limit', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Add Transaction');

    await page.fill('input[name="amount"]', '1000000.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Transaction added')).toBeVisible();
  });

  test('prevents submission of future date', async ({ page }) => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    await page.goto('/');
    await page.click('text=Add Transaction');

    await page.fill('input[name="amount"]', '100.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.fill('input[name="date"]', futureDate);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=future')).toBeVisible();
  });

  test('prevents submission of date older than 10 years', async ({ page }) => {
    const oldDate = '2015-01-01';

    await page.goto('/');
    await page.click('text=Add Transaction');

    await page.fill('input[name="amount"]', '100.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.fill('input[name="date"]', oldDate);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=10 years')).toBeVisible();
  });

  test('shows specific error messages for each invalid field', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Add Transaction');

    await page.fill('input[name="amount"]', 'invalid');
    await page.fill('input[name="date"]', 'invalid');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid amount format')).toBeVisible();
    await expect(page.locator('text=YYYY-MM-DD')).toBeVisible();
  });

  test('allows submission of valid transaction', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    await page.goto('/');
    await page.click('text=Add Transaction');

    await page.fill('input[name="amount"]', '150.50');
    await page.fill('input[name="payee"]', 'Test Payee');
    await page.fill('input[name="date"]', today);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Transaction added')).toBeVisible();
  });
});
