import { test, expect } from './fixtures';
import { sql } from '@vercel/postgres';
import { login } from './helpers/auth';
import { getAccountIdByName } from './helpers/database';
import type { Page, Locator } from '@playwright/test';

async function openAddTransactionForm(
  page: Page,
  accountId: number
): Promise<Locator> {
  await page.goto(`/transactions?accountId=${accountId}&lang=en`);

  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Transaction' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add Transaction' }).click();

  await expect(page.getByRole('heading', { name: 'Add Transaction' })).toBeVisible({
    timeout: 10000,
  });

  const form = page.locator('form', {
    has: page.locator('input[name="amount"]'),
  });
  await expect(form).toBeVisible();
  return form;
}

test.describe('Transaction Input Validation', () => {
  test.afterAll(async () => {
    // Clean up transactions created during tests
    console.log('🧹 Cleaning up input-validation test data...');
    await sql`DELETE FROM transactions`;
    console.log('✅ Cleanup complete');
  });
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('prevents submission of amount exceeding limit', async ({ page }) => {
    const accountId = await getAccountIdByName('Checking Account');
    const form = await openAddTransactionForm(page, accountId);

    await form.locator('input[name="amount"]').fill('1000000.01');
    await form.locator('input[name="payee"]').fill('Test');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('text=Amount must be between -1,000,000.00 and 1,000,000.00')).toBeVisible({ timeout: 5000 });
  });

  test('allows submission of amount at limit', async ({ page }) => {
    const accountId = await getAccountIdByName('Checking Account');
    const form = await openAddTransactionForm(page, accountId);

    await form.locator('input[name="amount"]').fill('1000000.00');
    await form.locator('input[name="payee"]').fill('Test');
    await form.locator('input[name="date"]').fill('2026-01-15');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('text=Transaction added')).toBeVisible({ timeout: 5000 });
  });

  test('prevents submission of future date', async ({ page }) => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const accountId = await getAccountIdByName('Checking Account');

    const form = await openAddTransactionForm(page, accountId);

    await form.locator('input[name="amount"]').fill('100.00');
    await form.locator('input[name="payee"]').fill('Test');
    await form.locator('input[name="date"]').fill(futureDate);
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('text=Date must be within last 10 years and not in the future')).toBeVisible({ timeout: 5000 });
  });

  test('prevents submission of date older than 10 years', async ({ page }) => {
    const oldDate = '2015-01-01';
    const accountId = await getAccountIdByName('Checking Account');

    const form = await openAddTransactionForm(page, accountId);

    await form.locator('input[name="amount"]').fill('100.00');
    await form.locator('input[name="payee"]').fill('Test');
    await form.locator('input[name="date"]').fill(oldDate);
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('text=Date must be within last 10 years and not in the future')).toBeVisible({ timeout: 5000 });
  });

  test('shows specific error messages for each invalid field', async ({ page }) => {
    const accountId = await getAccountIdByName('Checking Account');
    const form = await openAddTransactionForm(page, accountId);

    // Fill in valid amount and payee, but manipulate date to be invalid
    await form.locator('input[name="amount"]').fill('100.00');
    await form.locator('input[name="payee"]').fill('Test');

    // Use JavaScript to bypass browser date validation and set invalid value
    const dateInput = form.locator('input[name="date"]');
    await dateInput.evaluate((el: HTMLInputElement) => {
      el.removeAttribute('type');  // Remove type to bypass date validation
      el.value = 'invalid-date';
    });

    await form.locator('button[type="submit"]').click();

    await expect(page.locator('text=Invalid date format')).toBeVisible({ timeout: 5000 });
  });

  test('allows submission of valid transaction', async ({ page }) => {
    const accountId = await getAccountIdByName('Checking Account');

    const form = await openAddTransactionForm(page, accountId);

    await form.locator('input[name="amount"]').fill('150.50');
    await form.locator('input[name="payee"]').fill('Test Payee');
    await form.locator('input[name="date"]').fill('2026-01-15');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('text=Transaction added')).toBeVisible({ timeout: 5000 });
  });
});
