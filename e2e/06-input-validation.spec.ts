import { test, expect } from './fixtures';
import { sql } from '@vercel/postgres';

test.describe('Transaction Input Validation', () => {
  test.afterAll(async () => {
    // Clean up transactions created during tests
    console.log('🧹 Cleaning up input-validation test data...');
    await sql`DELETE FROM transactions`;
    console.log('✅ Cleanup complete');
  });
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

    await page.waitForSelector('[data-state="open"] form', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator('[data-state="open"] input[name="amount"]').fill('1000000.01');
    await page.locator('[data-state="open"] input[name="payee"]').fill('Test');
    await page.locator('[data-state="open"] button[type="submit"]').click();

    await expect(page.locator('text=Amount must be between -1,000,000.00 and 1,000,000.00')).toBeVisible({ timeout: 5000 });
  });

  test('allows submission of amount at limit', async ({ page }) => {
    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForSelector('[data-state="open"] form', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator('[data-state="open"] input[name="amount"]').fill('1000000.00');
    await page.locator('[data-state="open"] input[name="payee"]').fill('Test');
    await page.locator('[data-state="open"] button[type="submit"]').click();

    await expect(page.locator('text=Transaction added')).toBeVisible({ timeout: 5000 });
  });

  test('prevents submission of future date', async ({ page }) => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForSelector('[data-state="open"] form', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator('[data-state="open"] input[name="amount"]').fill('100.00');
    await page.locator('[data-state="open"] input[name="payee"]').fill('Test');
    await page.locator('[data-state="open"] input[name="date"]').fill(futureDate);
    await page.locator('[data-state="open"] button[type="submit"]').click();

    await expect(page.locator('text=Date must be within last 10 years and not in the future')).toBeVisible({ timeout: 5000 });
  });

  test('prevents submission of date older than 10 years', async ({ page }) => {
    const oldDate = '2015-01-01';

    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForSelector('[data-state="open"] form', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator('[data-state="open"] input[name="amount"]').fill('100.00');
    await page.locator('[data-state="open"] input[name="payee"]').fill('Test');
    await page.locator('[data-state="open"] input[name="date"]').fill(oldDate);
    await page.locator('[data-state="open"] button[type="submit"]').click();

    await expect(page.locator('text=Date must be within last 10 years and not in the future')).toBeVisible({ timeout: 5000 });
  });

  test('shows specific error messages for each invalid field', async ({ page }) => {
    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForSelector('[data-state="open"] form', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);

    // Fill in valid amount and payee, but manipulate date to be invalid
    await page.locator('[data-state="open"] input[name="amount"]').fill('100.00');
    await page.locator('[data-state="open"] input[name="payee"]').fill('Test');

    // Use JavaScript to bypass browser date validation and set invalid value
    const dateInput = page.locator('[data-state="open"] input[name="date"]');
    await dateInput.evaluate((el: HTMLInputElement) => {
      el.removeAttribute('type');  // Remove type to bypass date validation
      el.value = 'invalid-date';
    });

    await page.locator('[data-state="open"] button[type="submit"]').click();

    await expect(page.locator('text=Invalid date format')).toBeVisible({ timeout: 5000 });
  });

  test('allows submission of valid transaction', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    await page.goto('/accounts/1');
    await page.click('button:has-text("Add Transaction")');

    await page.waitForSelector('[data-state="open"] form', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator('[data-state="open"] input[name="amount"]').fill('150.50');
    await page.locator('[data-state="open"] input[name="payee"]').fill('Test Payee');
    await page.locator('[data-state="open"] input[name="date"]').fill(today);
    await page.locator('[data-state="open"] button[type="submit"]').click();

    await expect(page.locator('text=Transaction added')).toBeVisible({ timeout: 5000 });
  });
});
