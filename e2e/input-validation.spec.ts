import { test, expect } from '@playwright/test';

test.describe('Transaction Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('prevents submission of amount exceeding limit', async ({ page }) => {
    await page.goto('/accounts/1');
    await page.waitForSelector('button:has-text("Add Transaction")', { state: 'visible', timeout: 5000 });
    await page.click('button:has-text("Add Transaction")');

    await page.waitForSelector('[data-radix-dialog-content], [data-state="open"]', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);
    await page.fill('input[name="amount"]', '1000000.01');
    await page.fill('input[name="payee"]', 'Test');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Amount must be between -1,000,000.00 and 1,000,000.00')).toBeVisible({ timeout: 5000 });
  });

  test('allows submission of amount at limit', async ({ page }) => {
    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForTimeout(500);
    await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
    await page.fill('input[name="amount"]', '1000000.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Transaction added')).toBeVisible({ timeout: 5000 });
  });

  test('prevents submission of future date', async ({ page }) => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForTimeout(500);
    await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
    await page.fill('input[name="amount"]', '100.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.fill('input[name="date"]', futureDate);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Date must be within last 10 years and not in the future')).toBeVisible({ timeout: 5000 });
  });

  test('prevents submission of date older than 10 years', async ({ page }) => {
    const oldDate = '2015-01-01';

    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForTimeout(500);
    await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
    await page.fill('input[name="amount"]', '100.00');
    await page.fill('input[name="payee"]', 'Test');
    await page.fill('input[name="date"]', oldDate);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Date must be within last 10 years and not in the future')).toBeVisible({ timeout: 5000 });
  });

  test('shows specific error messages for each invalid field', async ({ page }) => {
    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForTimeout(500);
    await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
    await page.fill('input[name="amount"]', 'invalid');
    await page.fill('input[name="date"]', 'invalid');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid amount format')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Invalid date format (YYYY-MM-DD)')).toBeVisible({ timeout: 5000 });
  });

  test('allows submission of valid transaction', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForTimeout(500);
    await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
    await page.fill('input[name="amount"]', '150.50');
    await page.fill('input[name="payee"]', 'Test Payee');
    await page.fill('input[name="date"]', today);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Transaction added')).toBeVisible({ timeout: 5000 });
  });
});
