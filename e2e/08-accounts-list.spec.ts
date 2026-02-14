import { test, expect } from './fixtures';
import { login } from './helpers/auth';
import { getAccountIdByName } from './helpers/database';

/**
 * Accounts List Page End-to-End Tests
 *
 * Tests the accounts list page including:
 * - Page structure and heading
 * - Account cards display
 * - Navigation to account details
 * - Navbar link visibility
 * - Responsive design
 */

test.describe('Accounts List Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display accounts page heading and structure', async ({ page }) => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    // Verify main heading
    await expect(
      page.getByRole('heading', { name: /accounts/i, level: 2 })
    ).toBeVisible();

    // Verify subheading/description
    await expect(
      page.getByText(/manage your financial accounts/i)
    ).toBeVisible();

    // Verify URL
    await expect(page).toHaveURL('/accounts');
  });

  test('should display account cards with balances', async ({ page }) => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    // Check for the seeded accounts (use first() to handle multiple matches)
    await expect(page.getByText('Checking Account').first()).toBeVisible();
    await expect(page.getByText('Savings Account').first()).toBeVisible();
    await expect(page.getByText('Credit Card').first()).toBeVisible();

    // Verify balance format (currency with $ symbol)
    const balanceElements = page.locator('text=/\\$[\\d,]+\\.\\d{2}/');
    const count = await balanceElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to account detail when clicking account card', async ({ page }) => {
    const accountId = await getAccountIdByName('Checking Account');

    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    // Click on Checking Account card
    await page.getByText('Checking Account').click();

    // Should navigate to account detail page
    await expect(page).toHaveURL(`/accounts/${accountId}`);
    await expect(
      page.getByRole('heading', { name: 'Checking Account' })
    ).toBeVisible();
  });

  test('should display accounts link in navbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check navbar has Accounts link
    const accountsNavLink = page.getByRole('link', { name: /accounts/i });
    await expect(accountsNavLink).toBeVisible();
  });

  test('should navigate to accounts page from navbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Accounts link in navbar
    await page.getByRole('link', { name: /accounts/i }).click();

    // Should navigate to accounts page
    await expect(page).toHaveURL('/accounts');
    await expect(
      page.getByRole('heading', { name: /accounts/i })
    ).toBeVisible();
  });

  test('should have accounts link between dashboard and settings in navbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all nav links
    const nav = page.locator('nav');
    const navLinks = await nav.locator('a').allTextContents();

    // Find positions
    const dashboardIndex = navLinks.findIndex((text) =>
      text.toLowerCase().includes('dashboard')
    );
    const accountsIndex = navLinks.findIndex((text) =>
      text.toLowerCase().includes('accounts')
    );
    const settingsIndex = navLinks.findIndex((text) =>
      text.toLowerCase().includes('settings')
    );

    // Verify order: Dashboard -> Accounts -> Settings
    expect(dashboardIndex).toBeLessThan(accountsIndex);
    expect(accountsIndex).toBeLessThan(settingsIndex);
  });

  test('should be responsive and render properly on different viewports', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /accounts/i })
    ).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(
      page.getByRole('heading', { name: /accounts/i })
    ).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(
      page.getByRole('heading', { name: /accounts/i })
    ).toBeVisible();

    // Account cards should still be visible on mobile
    await expect(page.getByText('Checking Account')).toBeVisible();
  });

  test('should load accounts page within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should maintain session when navigating to accounts page', async ({ page }) => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    // Should not redirect to login
    await expect(page).toHaveURL('/accounts');
    await expect(page).not.toHaveURL('/login');
  });
});

test.describe('Accounts List Page - Unauthenticated', () => {
  test('should redirect to login when accessing accounts page without auth', async ({
    page,
  }) => {
    // Clear any existing session
    await page.context().clearCookies();

    await page.goto('/accounts');

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });
});
