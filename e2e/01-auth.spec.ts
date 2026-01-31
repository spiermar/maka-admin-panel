import { test, expect } from './fixtures';

/**
 * Authentication End-to-End Tests
 *
 * Tests the complete login flow including:
 * - Login page rendering
 * - Form validation
 * - Successful authentication
 * - Session persistence
 * - Redirect to dashboard
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the login page
    await page.goto('/login');
  });

  test('should display login page with correct elements', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Maka Admin Panel/i);

    // Verify login card is visible
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();

    // Verify card description
    await expect(page.getByText(/enter your credentials to access your ledger/i)).toBeVisible();

    // Verify form inputs are present
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Verify submit button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should require username and password', async ({ page }) => {
    // Click submit without entering credentials
    await page.getByRole('button', { name: /sign in/i }).click();

    // HTML5 validation should prevent form submission
    const usernameInput = page.getByLabel(/username/i);
    const isValid = await usernameInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Fill in the login form with test credentials
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('/');

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/');

    // Verify dashboard heading is visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should redirect to dashboard if already logged in', async ({ page }) => {
    // First login
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for dashboard to load
    await page.waitForURL('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Try to visit login page again
    await page.goto('/login');

    // Should be redirected back to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Login
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for dashboard
    await page.waitForURL('/');

    // Reload the page
    await page.reload();

    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    // Fill in with invalid credentials
    await page.getByLabel(/username/i).fill('invalid_user');
    await page.getByLabel(/password/i).fill('wrong_password');

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should stay on login page
    await expect(page).toHaveURL('/login');

    // Login card should still be visible
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });
});
